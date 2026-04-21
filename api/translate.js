/**
 * api/translate.js — Vercel serverless function.
 *
 * Triggered by a Sanity webhook on publish/update of any translatable
 * document. Walks the document looking for i18nString / i18nText /
 * i18nPortableText objects, auto-translates the English source into
 * Portuguese and Spanish via Claude Haiku 4.5, and patches the results
 * back into the same document.
 *
 * BEHAVIOUR PER FIELD (for each of pt and es):
 *   - If the "locked" flag is on → skip. Client has manually edited.
 *   - If the current target value differs from the last snapshot we wrote
 *     (i.e. the client edited the translation by hand) → flip the lock on,
 *     update the snapshot, skip. Their manual edit is now protected.
 *   - Otherwise → translate the English source, write it to the target, and
 *     update the snapshot so a future manual edit can be detected.
 *
 * ENV VARS required on Vercel:
 *   - ANTHROPIC_API_KEY       — Anthropic console API key
 *   - SANITY_WRITE_TOKEN      — Sanity token with Editor role
 *   - SANITY_WEBHOOK_SECRET   — Shared secret; Sanity signs each webhook with it
 *
 * SANITY WEBHOOK CONFIG:
 *   POST this endpoint on Publish for filter:
 *   _type in ["siteSettings","hero","about","services","pricing","stats",
 *             "portfolio","photography","howItWorks","contact"]
 *   Projection (the request body Sanity sends us): {_id, _type}
 *   Include the secret under the "Secret" field so HMAC headers match.
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@sanity/client';
import crypto from 'node:crypto';

const SANITY_PROJECT_ID = 'u3pno5p8';
const SANITY_DATASET = 'production';
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

const LANG_LABELS = {
  pt: 'Brazilian Portuguese',
  es: 'Latin American Spanish',
};

const I18N_TYPES = new Set(['i18nString', 'i18nText', 'i18nPortableText']);

// ── Client setup ────────────────────────────────────────────────────────────

const sanity = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  useCdn: false,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Webhook signature verification ──────────────────────────────────────────

/**
 * Sanity sends an HMAC-SHA256 signature of the raw request body as
 * `sanity-webhook-signature`. Compare against ours; reject on mismatch.
 */
function verifySanitySignature(rawBody, header, secret) {
  if (!header || !secret) return false;
  // Sanity header format: "t=<timestamp>,v1=<signature>"
  const parts = Object.fromEntries(
    header.split(',').map((p) => p.split('=').map((s) => s.trim()))
  );
  const provided = parts.v1;
  if (!provided) return false;

  const signed = `${parts.t}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(signed).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

// ── Translation ─────────────────────────────────────────────────────────────

/**
 * Translate plain text via Claude. Returns the translation as a string.
 * Throws on API error so the webhook caller can 500.
 */
async function translatePlain(englishText, targetLang) {
  if (!englishText || !englishText.trim()) return '';

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    // temperature: 0 → deterministic output for the same input, which
    // lets our "skip if translation unchanged" guard actually work.
    temperature: 0,
    system:
      `You are translating a UGC (user-generated content) creator's marketing ` +
      `website from English to ${LANG_LABELS[targetLang]}. Tone: casual, warm, ` +
      `professional — like a creator writing to brands. ` +
      `Keep industry terms like "UGC", "CTA", and proper nouns (Bruna Barros) ` +
      `in English. Preserve punctuation and any ampersand symbol. ` +
      `Return ONLY the translated text — no preamble, no quotes, no explanation.`,
    messages: [{ role: 'user', content: englishText }],
  });

  const block = response.content.find((c) => c.type === 'text');
  return (block?.text || '').trim();
}

/**
 * Translate a Portable Text block array.
 *
 * Strategy: for each block, flatten its spans into Markdown (**bold**,
 * *italic*) to preserve formatting, translate the paragraph as a whole,
 * then re-parse the Markdown back into spans with the original marks.
 * If parsing fails we fall back to a single unformatted span so the paragraph
 * still renders.
 */
async function translatePortableText(blocks, targetLang) {
  if (!Array.isArray(blocks) || blocks.length === 0) return [];

  const translated = await Promise.all(
    blocks.map(async (block) => {
      if (block._type !== 'block') return block;

      const markdown = (block.children || [])
        .map((span) => {
          let t = span.text || '';
          if (span.marks?.includes('strong')) t = `**${t}**`;
          if (span.marks?.includes('em')) t = `*${t}*`;
          return t;
        })
        .join('');

      if (!markdown.trim()) return block;

      const translatedMarkdown = await translatePlain(markdown, targetLang);
      const children = parseMarkdownToSpans(translatedMarkdown);

      return {
        ...block,
        _key: block._key || randomKey(),
        children,
        markDefs: block.markDefs || [],
      };
    })
  );

  return translated;
}

/** Convert `**bold**` and `*italic*` Markdown into Sanity span objects. */
function parseMarkdownToSpans(markdown) {
  const spans = [];
  // Longest-first so ** wins over *.
  const tokenRe = /(\*\*([^*]+)\*\*|\*([^*]+)\*|[^*]+)/g;
  let match;
  while ((match = tokenRe.exec(markdown)) !== null) {
    const [, full, bold, italic] = match;
    if (bold != null) {
      spans.push({ _type: 'span', _key: randomKey(), text: bold, marks: ['strong'] });
    } else if (italic != null) {
      spans.push({ _type: 'span', _key: randomKey(), text: italic, marks: ['em'] });
    } else {
      spans.push({ _type: 'span', _key: randomKey(), text: full, marks: [] });
    }
  }
  // Safety: if parser produced nothing (e.g. empty string), return one empty span.
  return spans.length ? spans : [{ _type: 'span', _key: randomKey(), text: '', marks: [] }];
}

function randomKey() {
  return crypto.randomBytes(6).toString('hex');
}

// ── Field walker ────────────────────────────────────────────────────────────

/**
 * Recursively walks a document and collects every i18n object it finds,
 * along with the JSONPath-style path to patch it at.
 *
 * Paths use Sanity's patch syntax:
 *   - Keyed array items:   "items[_key==\"abc123\"].title"
 *   - Numeric array items: "items[2].title"
 *   - Nested:              "packages[_key==\"p1\"].features[_key==\"f2\"]"
 */
function collectI18nFields(node, pathParts, out) {
  if (node == null) return;

  if (Array.isArray(node)) {
    node.forEach((item, idx) => {
      const keyed = item && typeof item === 'object' && item._key;
      const segment = keyed ? `[_key=="${item._key}"]` : `[${idx}]`;
      const childPath = pathParts.length ? [...pathParts, segment] : [segment];
      collectI18nFields(item, childPath, out);
    });
    return;
  }

  if (typeof node === 'object') {
    if (I18N_TYPES.has(node._type)) {
      out.push({ path: pathParts.join(''), value: node, type: node._type });
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('_')) continue;
      const childPath = [...pathParts, pathParts.length ? `.${key}` : key];
      collectI18nFields(value, childPath, out);
    }
  }
}

// ── Main webhook handler ────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // We need the raw request body for HMAC verification. Vercel's default body
  // parser would give us a parsed object, so we read the stream ourselves.
  const rawBody = await readRawBody(req);
  const secret = process.env.SANITY_WEBHOOK_SECRET;
  const signatureHeader = req.headers['sanity-webhook-signature'];

  if (!verifySanitySignature(rawBody, signatureHeader, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { _id, _type } = payload;
  if (!_id) return res.status(400).json({ error: 'Missing _id' });

  // Fetch the full document (authenticated, bypasses CDN for freshness).
  const doc = await sanity.getDocument(_id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  // Find every translatable field in the doc.
  const fields = [];
  collectI18nFields(doc, [], fields);

  if (fields.length === 0) {
    return res.status(200).json({ message: 'No translatable fields', translated: 0 });
  }

  // Process each field, collecting patch operations.
  const patchOps = {}; // key = dot-path, value = new value

  let translatedCount = 0;
  let lockedCount = 0;

  for (const { path, value, type } of fields) {
    const isPortable = type === 'i18nPortableText';

    for (const lang of ['pt', 'es']) {
      const lockField = `${lang}Locked`;
      const snapshotField = `${lang}Snapshot`;

      // Already manually locked — respect it.
      if (value[lockField]) {
        lockedCount++;
        continue;
      }

      const current = value[lang];
      const snapshot = value[snapshotField];
      const currentSerialized = isPortable ? JSON.stringify(current ?? []) : current ?? '';

      // Detect manual edit: current value differs from last snapshot we wrote,
      // AND there's actually a current value to protect.
      const hasContent = isPortable
        ? Array.isArray(current) && current.length > 0
        : typeof current === 'string' && current.trim().length > 0;

      if (hasContent && snapshot && currentSerialized !== snapshot) {
        // Manual edit detected → lock from now on, update snapshot.
        patchOps[`${path}.${lockField}`] = true;
        patchOps[`${path}.${snapshotField}`] = currentSerialized;
        lockedCount++;
        continue;
      }

      // Unlocked path → translate English → target.
      const english = value.en;
      const englishHasContent = isPortable
        ? Array.isArray(english) && english.length > 0
        : typeof english === 'string' && english.trim().length > 0;

      if (!englishHasContent) continue; // nothing to translate

      try {
        let translated;
        if (isPortable) {
          translated = await translatePortableText(english, lang);
        } else {
          translated = await translatePlain(english, lang);
        }

        const translatedSerialized = isPortable ? JSON.stringify(translated) : translated;

        // Only patch if the translation actually changed — avoids unnecessary writes.
        if (currentSerialized !== translatedSerialized) {
          patchOps[`${path}.${lang}`] = translated;
          patchOps[`${path}.${snapshotField}`] = translatedSerialized;
          translatedCount++;
        }
      } catch (err) {
        console.error(
          `[translate] Failed for ${_type}:${_id} at ${path}.${lang}:`,
          err.message
        );
        // Don't fail the whole batch on one field's error.
      }
    }
  }

  if (Object.keys(patchOps).length === 0) {
    return res.status(200).json({
      message: 'Nothing to patch',
      translated: translatedCount,
      locked: lockedCount,
    });
  }

  // Apply all updates in a single patch commit.
  try {
    await sanity.patch(_id).set(patchOps).commit({ autoGenerateArrayKeys: true });
  } catch (err) {
    console.error('[translate] Sanity patch failed:', err.message);
    return res.status(500).json({ error: 'Sanity patch failed', detail: err.message });
  }

  return res.status(200).json({
    message: 'OK',
    translated: translatedCount,
    locked: lockedCount,
    fields: fields.length,
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// Tell Vercel not to parse the body — we need the raw string for HMAC.
export const config = {
  api: {
    bodyParser: false,
  },
};
