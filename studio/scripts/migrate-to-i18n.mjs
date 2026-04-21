/**
 * migrate-to-i18n.mjs — One-shot script to convert existing plain-string
 * content to the new i18n shape.
 *
 * Before this migration:  { brandName: "Bruna Barros" }
 * After  this migration:  { brandName: { _type: 'i18nString', en: "Bruna Barros" } }
 *
 * USAGE:
 *   SANITY_TOKEN=your_write_token node studio/scripts/migrate-to-i18n.mjs
 *
 * SAFE TO RE-RUN: Values that are already in the i18n shape are skipped.
 *
 * AFTER RUNNING:
 *   Each patched document will fire the translation webhook, which fills in
 *   Portuguese and Spanish via Claude. If the webhook isn't deployed yet,
 *   the Portuguese/Spanish fields stay empty and the frontend falls back to
 *   English — the site keeps working.
 */

import { createClient } from '@sanity/client'

const token = process.env.SANITY_TOKEN
if (!token) {
  console.error('\n❌  SANITY_TOKEN is not set.')
  console.error('   Get a write token at: https://sanity.io/manage → API → Tokens')
  console.error('   Then run: SANITY_TOKEN=your_token node studio/scripts/migrate-to-i18n.mjs\n')
  process.exit(1)
}

const client = createClient({
  projectId: 'u3pno5p8',
  dataset: 'production',
  useCdn: false,
  token,
  apiVersion: '2024-01-01',
})

// ── Map of doc type → translatable field paths ──────────────────────────────
//
// Each entry describes one i18n field:
//   { path, type }
//
// path — a jsonpath-ish template. Array items use "[]" to iterate.
// type — 'i18nString' | 'i18nText' | 'i18nPortableText'

const FIELD_MAP = {
  siteSettings: [
    { path: 'brandName', type: 'i18nString' },
    { path: 'footerText', type: 'i18nString' },
  ],
  hero: [
    { path: 'firstName', type: 'i18nString' },
    { path: 'lastName', type: 'i18nString' },
    { path: 'role', type: 'i18nString' },
  ],
  about: [
    { path: 'heading', type: 'i18nString' },
    { path: 'body', type: 'i18nPortableText' },
  ],
  services: [
    { path: 'sectionTitle', type: 'i18nString' },
    { path: 'items[].title', type: 'i18nString' },
    { path: 'items[].description', type: 'i18nText' },
  ],
  pricing: [
    { path: 'sectionTitle', type: 'i18nString' },
    { path: 'introText', type: 'i18nText' },
    { path: 'packages[].name', type: 'i18nString' },
    { path: 'packages[].priceLabel', type: 'i18nString' },
    { path: 'packages[].features[]', type: 'i18nString' },
    { path: 'packages[].targetDescription', type: 'i18nString' },
    { path: 'packages[].badgeLabel', type: 'i18nString' },
    { path: 'packages[].ctaLabel', type: 'i18nString' },
  ],
  stats: [
    { path: 'items[].label', type: 'i18nString' },
  ],
  portfolio: [
    { path: 'sectionTitle', type: 'i18nString' },
    { path: 'videos[].label', type: 'i18nString' },
  ],
  photography: [
    { path: 'sectionTitle', type: 'i18nString' },
    { path: 'photos[].alt', type: 'i18nString' },
  ],
  howItWorks: [
    { path: 'sectionTitle', type: 'i18nString' },
    { path: 'steps[].title', type: 'i18nString' },
    { path: 'steps[].description', type: 'i18nText' },
  ],
  contact: [
    { path: 'heading', type: 'i18nString' },
    { path: 'subheading', type: 'i18nString' },
  ],
}

// ── Shape conversion ────────────────────────────────────────────────────────

/**
 * Wrap a plain value into an i18n object (if not already).
 * For Portable Text, the value is an array of blocks.
 */
function toI18nShape(value, type) {
  // Already converted? Leave it alone.
  if (value && typeof value === 'object' && !Array.isArray(value) && value._type === type) {
    return null // no-op
  }
  return {
    _type: type,
    en: value,
    pt: type === 'i18nPortableText' ? [] : '',
    es: type === 'i18nPortableText' ? [] : '',
    ptLocked: false,
    esLocked: false,
    ptSnapshot: '',
    esSnapshot: '',
  }
}

/**
 * Collect Sanity .set() operations for one document based on its FIELD_MAP entries.
 * Handles paths with "[]" array iteration.
 */
function buildPatchOps(doc, fieldMapEntries) {
  const ops = {}

  for (const { path, type } of fieldMapEntries) {
    collectOpsForPath(doc, path.split('.'), [], type, ops)
  }

  return ops
}

function collectOpsForPath(node, segments, pathSoFar, type, ops) {
  if (segments.length === 0) {
    // Terminal: node is the value to convert.
    const wrapped = toI18nShape(node, type)
    if (wrapped !== null) {
      ops[pathSoFar.join('')] = wrapped
    }
    return
  }

  const [segment, ...rest] = segments
  const isArraySegment = segment.endsWith('[]')
  const fieldName = isArraySegment ? segment.slice(0, -2) : segment

  const nextNode = node?.[fieldName]
  if (nextNode == null) return

  if (isArraySegment) {
    if (!Array.isArray(nextNode)) return
    nextNode.forEach((item, idx) => {
      const keyed = item && typeof item === 'object' && item._key
      const arrayAccessor = keyed ? `[_key=="${item._key}"]` : `[${idx}]`
      const newPath = [
        ...pathSoFar,
        pathSoFar.length === 0 ? fieldName : `.${fieldName}`,
        arrayAccessor,
      ]
      collectOpsForPath(item, rest, newPath, type, ops)
    })
  } else {
    const newPath = [...pathSoFar, pathSoFar.length === 0 ? fieldName : `.${fieldName}`]
    collectOpsForPath(nextNode, rest, newPath, type, ops)
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n📋 Migration: converting plain strings to i18n shape...\n')

  let totalDocs = 0
  let totalPatches = 0

  for (const [docType, fieldMap] of Object.entries(FIELD_MAP)) {
    console.log(`→ ${docType}`)
    const docs = await client.fetch(`*[_type == $type]`, { type: docType })

    for (const doc of docs) {
      totalDocs++
      const ops = buildPatchOps(doc, fieldMap)
      const keys = Object.keys(ops)
      if (keys.length === 0) {
        console.log(`  ${doc._id}: already migrated (${fieldMap.length} fields)`)
        continue
      }

      console.log(`  ${doc._id}: converting ${keys.length} field${keys.length === 1 ? '' : 's'}`)
      try {
        await client.patch(doc._id).set(ops).commit()
        totalPatches += keys.length
      } catch (err) {
        console.error(`  ❌  Patch failed for ${doc._id}: ${err.message}`)
      }
    }
  }

  console.log(`\n✅ Done. ${totalDocs} documents scanned, ${totalPatches} fields converted.`)
  console.log(`\nNext step: the translation webhook will fire for each patched document`)
  console.log(`and fill in Portuguese + Spanish translations. Check your Sanity docs`)
  console.log(`in a few seconds — translations should appear automatically.\n`)
}

main().catch((err) => {
  console.error('\n💥 Migration failed:', err)
  process.exit(1)
})
