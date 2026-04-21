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
  const expected = crypto.createHmac('sha256', secret).update(signed).digest('base64url');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(provided, 'base64url'),
      Buffer.from(expected, 'base64url')
    );
  } catch {
    return false;
  }
}

// ── Translation ─────────────────────────────────────────────────────────────

/**
 * Translate plain text via Claude. Returns the translation as a string.
 * Uses XML-tag wrapping so short/ambiguous inputs don't trigger conversational
 * responses, and caps max_tokens proportional to input length to prevent
 * hallucinated extra content.
 */
async function translatePlain(englishText, targetLang) {
  if (!englishText || !englishText.trim()) return '';

  const lang = LANG_LABELS[targetLang];
  // ~4 chars per token, 3x headroom for target-language expansion and the
  // <translation> wrapper. Clamped to [256, 4096].
  const maxTokens = Math.max(256, Math.min(4096, Math.ceil(englishText.length / 4) * 3 + 64));

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    temperature: 0,
    system: [
      `Translate the text inside <source> tags from English to ${lang}.`,
      `Output the translation wrapped in <translation></translation> tags. Nothing outside the tags.`,
      ``,
      `Rules:`,
      `- Do NOT ask questions, add commentary, or request clarification. Short or ambiguous input is fine — translate literally.`,
      `- NEVER add content, bullet points, or extra sentences that aren't in the source.`,
      `- Keep unchanged: "Bruna Barros", "UGC", "CTA". Translate everything else, including product/package names (e.g. "Brand Pack" → ${targetLang === 'pt' ? '"Pacote da Marca"' : '"Paquete de Marca"'}).`,
      `- Preserve all punctuation and ampersands.`,
      `- Tone: casual, warm, professional — a creator writing to brands.`,
    ].join('\n'),
    messages: [{ role: 'user', content: `<source>${englishText}</source>` }],
  });

  const block = response.content.find((c) => c.type === 'text');
  const raw = (block?.text || '').trim();
  // Extract from <translation> tags; fall back to raw if Claude skipped the wrapper.
  const match = raw.match(/<translation>([\s\S]*?)<\/translation>/i);
  return (match ? match[1] : raw).trim();
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

  // Build one task per (field × lang). Run them all in parallel — Claude
  // Haiku handles ~50 concurrent requests easily, and this fits comfortably
  // under Vercel's function timeout (serial would exceed it on larger docs).
  const tasks = [];
  for (const { path, value, type } of fields) {
    for (const lang of ['pt', 'es']) {
      tasks.push({ path, value, type, lang });
    }
  }

  const results = await Promise.all(
    tasks.map(async ({ path, value, type, lang }) => {
      const isPortable = type === 'i18nPortableText';
      const lockField = `${lang}Locked`;
      const snapshotField = `${lang}Snapshot`;

      if (value[lockField]) return { kind: 'locked' };

      const current = value[lang];
      const snapshot = value[snapshotField];
      const currentSerialized = isPortable ? JSON.stringify(current ?? []) : current ?? '';

      const hasContent = isPortable
        ? Array.isArray(current) && current.length > 0
        : typeof current === 'string' && current.trim().length > 0;

      // Manual edit detected → auto-lock and stop overwriting.
      if (hasContent && snapshot && currentSerialized !== snapshot) {
        return {
          kind: 'autolock',
          ops: {
            [`${path}.${lockField}`]: true,
            [`${path}.${snapshotField}`]: currentSerialized,
          },
        };
      }

      const english = value.en;
      const englishHasContent = isPortable
        ? Array.isArray(english) && english.length > 0
        : typeof english === 'string' && english.trim().length > 0;

      if (!englishHasContent) return { kind: 'empty' };

      try {
        const translated = isPortable
          ? await translatePortableText(english, lang)
          : await translatePlain(english, lang);

        const translatedSerialized = isPortable ? JSON.stringify(translated) : translated;
        if (currentSerialized === translatedSerialized) return { kind: 'nochange' };

        return {
          kind: 'translated',
          ops: {
            [`${path}.${lang}`]: translated,
            [`${path}.${snapshotField}`]: translatedSerialized,
          },
        };
      } catch (err) {
        console.error(
          `[translate] Failed for ${_type}:${_id} at ${path}.${lang}:`,
          err.message
        );
        return { kind: 'error' };
      }
    })
  );

  const patchOps = {};
  let translatedCount = 0;
  let lockedCount = 0;
  for (const r of results) {
    if (r.ops) Object.assign(patchOps, r.ops);
    if (r.kind === 'translated') translatedCount++;
    if (r.kind === 'locked' || r.kind === 'autolock') lockedCount++;
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
  maxDuration: 60,
};
