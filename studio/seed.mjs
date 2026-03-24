/**
 * seed.mjs — Pre-populate Sanity with the current website content.
 *
 * USAGE:
 *   1. Create a write-enabled token at:
 *      https://sanity.io/manage → Your Project → API → Tokens → Add API token
 *      (Choose "Editor" role)
 *
 *   2. Run the script:
 *      SANITY_TOKEN=your_token node seed.mjs
 *
 *   This script is safe to run multiple times — it uses createOrReplace,
 *   so running it again simply overwrites existing data with the same values.
 *
 *   Images and videos are uploaded to the Sanity asset store and
 *   referenced from the documents, so they serve from the Sanity CDN.
 */

import { createClient } from '@sanity/client'
import { createReadStream, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PHOTOS_DIR = path.join(__dirname, '..', 'photos')
const VIDEOS_DIR = path.join(__dirname, '..', 'videos')

// ── 1. SANITY CLIENT ──────────────────────────────────────────────────────────

const token = process.env.SANITY_TOKEN
if (!token) {
  console.error('\n❌  SANITY_TOKEN is not set.\n')
  console.error('   Get a write token at:')
  console.error('   https://sanity.io/manage → API → Tokens → Add API token')
  console.error('\n   Then run:')
  console.error('   SANITY_TOKEN=your_token node seed.mjs\n')
  process.exit(1)
}

const client = createClient({
  projectId: 'u3pno5p8',
  dataset: 'production',
  useCdn: false,
  token,
  apiVersion: '2024-01-01',
})

// ── 2. ASSET UPLOAD HELPERS ───────────────────────────────────────────────────

async function uploadImage(filename) {
  const filepath = path.join(PHOTOS_DIR, filename)
  if (!existsSync(filepath)) {
    console.warn(`  ⚠️  Image not found: ${filename} — skipping`)
    return null
  }
  const ext = path.extname(filename).slice(1).toLowerCase()
  const contentType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`
  console.log(`  Uploading image: ${filename}`)
  const asset = await client.assets.upload('image', createReadStream(filepath), {
    filename,
    contentType,
  })
  return asset._id  // e.g. "image-Tb9Ew8CX-2000x3000-jpg"
}

async function uploadVideo(filename) {
  const filepath = path.join(VIDEOS_DIR, filename)
  if (!existsSync(filepath)) {
    console.warn(`  ⚠️  Video not found: ${filename} — skipping`)
    return null
  }
  console.log(`  Uploading video: ${filename}  (may take a moment…)`)
  const asset = await client.assets.upload('file', createReadStream(filepath), {
    filename,
    contentType: 'video/mp4',
  })
  return asset._id  // e.g. "file-abc123-mp4"
}

// Sanity image document shape { _type: 'image', asset: { _type: 'reference', _ref: '…' } }
const img = (assetId, extra = {}) => ({
  _type: 'image',
  asset: { _type: 'reference', _ref: assetId },
  ...extra,
})

// Sanity file document shape
const file = (assetId) => ({
  _type: 'file',
  asset: { _type: 'reference', _ref: assetId },
})

// ── 3. PORTABLE TEXT HELPERS ──────────────────────────────────────────────────

// Simple paragraph block
function para(text) {
  return {
    _type: 'block',
    _key: randomKey(),
    style: 'normal',
    markDefs: [],
    children: [span(text)],
  }
}

// Paragraph built from multiple spans (for inline bold/italic)
function richPara(...spans) {
  return {
    _type: 'block',
    _key: randomKey(),
    style: 'normal',
    markDefs: [],
    children: spans.map(([text, marks = []]) => span(text, marks)),
  }
}

function span(text, marks = []) {
  return { _type: 'span', _key: randomKey(), text, marks }
}

function randomKey() {
  return Math.random().toString(36).slice(2, 9)
}

// ── 4. SEED ───────────────────────────────────────────────────────────────────

async function seed() {
  console.log('\n🌱  Starting Sanity seed for Bruna Barros\n')

  // ── Upload assets ──────────────────────────────────────────────────────────
  console.log('📸  Uploading images…')
  const [
    profileId,
    photo1Id, photo2Id, photo3Id, photo4Id,
    poster1Id, poster2Id,
  ] = await Promise.all([
    uploadImage('bruna-profile.jpg'),
    uploadImage('portfolio1.jpg'),
    uploadImage('portfolio2.jpg'),
    uploadImage('portfolio3.jpg'),
    uploadImage('portfolio4.jpg'),
    uploadImage('poster1.png'),
    uploadImage('poster2.png'),
  ])

  console.log('\n🎬  Uploading videos…')
  const video1Id = await uploadVideo('Video1.mp4')
  const video2Id = await uploadVideo('Video2.mp4')

  // ── Create / replace documents ─────────────────────────────────────────────
  console.log('\n📝  Writing documents…\n')

  // siteSettings ─────────────────────────────────────────────────────────────
  await client.createOrReplace({
    _type: 'siteSettings',
    _id: 'siteSettings',
    brandName: 'Bruna Barros',
    email: 'brubarros13@gmail.com',
    instagramUrl: 'https://www.instagram.com/brunabarroz/',
    youtubeUrl: 'https://www.youtube.com/@BrunaBarroz',
    tiktokUrl: 'https://www.tiktok.com/@brunabarroz',
    footerText: '© 2026 Bruna Barros. All rights reserved.',
  })
  console.log('  ✅  siteSettings')

  // hero ─────────────────────────────────────────────────────────────────────
  await client.createOrReplace({
    _type: 'hero',
    _id: 'hero',
    firstName: 'Bruna',
    lastName: 'Barros',
    role: 'UGC Creator & Content Creator',
    ...(profileId && { heroImage: img(profileId) }),
  })
  console.log('  ✅  hero')

  // about ────────────────────────────────────────────────────────────────────
  await client.createOrReplace({
    _type: 'about',
    _id: 'about',
    heading: "Hi, I'm Bruna!",
    body: [
      para(
        "I'm a Brazilian content creator who's been showing up on YouTube for 3+ years — 50K subscribers and a real, engaged community built around lifestyle, beauty, and travel content. I know what makes people actually choose to watch something, and more importantly, what makes them trust a recommendation.",
      ),
      para(
        "My content feels real because it is. No overly polished scripts, no corporate energy — just genuine storytelling that connects.",
      ),
      richPara(
        ['Being fluent in ', []],
        ['English, Portuguese, and Spanish', ['strong']],
        [
          ' is a big part of what I bring to the table. If you want to reach Brazilian or Latin American audiences, I can create content that actually sounds like a local — because I am one.',
          [],
        ],
      ),
    ],
  })
  console.log('  ✅  about')

  // services ─────────────────────────────────────────────────────────────────
  await client.createOrReplace({
    _type: 'services',
    _id: 'services',
    sectionTitle: 'What I Create',
    items: [
      {
        _type: 'serviceCard',
        _key: 'service1',
        title: 'Travel & Airbnb Content',
        description:
          'Destination guides, Airbnb reviews, hotel and accommodation content, packing tips, and honest travel recommendations — the kind of content that makes people book.',
      },
      {
        _type: 'serviceCard',
        _key: 'service2',
        title: 'Tech & App Reviews',
        description:
          'Honest, engaging app demos and digital product reviews — UGC content that shows real usage and drives downloads and sign-ups.',
      },
      {
        _type: 'serviceCard',
        _key: 'service3',
        title: 'Travel Essentials',
        description:
          'Luggage, backpacks, travel accessories, and gear reviews — authentic content built for travelers who research before they buy.',
      },
      {
        _type: 'serviceCard',
        _key: 'service4',
        title: 'Short-Form Ads',
        description:
          'UGC ads optimised for TikTok, Instagram Reels, and Meta — concept, filming, and editing handled end-to-end.',
      },
    ],
  })
  console.log('  ✅  services')

  // pricing ──────────────────────────────────────────────────────────────────
  await client.createOrReplace({
    _type: 'pricing',
    _id: 'pricing',
    sectionTitle: 'Pricing',
    introText:
      "Pricing may vary based on deliverables, usage rights, and brand needs. Custom requests? Let's talk — I'm flexible.",
    packages: [
      {
        _type: 'pricingPackage',
        _key: 'pkg1',
        name: 'Starter',
        priceLabel: 'Starting at $75 USD',
        features: [
          '1 vertical video (up to 60s)',
          '1 revision round',
          'Delivered in 7 days',
        ],
        targetDescription: 'Perfect for brands wanting to test UGC for the first time.',
        featured: false,
        ctaLabel: 'Get Started',
      },
      {
        _type: 'pricingPackage',
        _key: 'pkg2',
        name: 'Core',
        priceLabel: 'Starting at $190 USD',
        features: [
          '3 vertical videos',
          '1 revision round each',
          'Delivered in 10 days',
        ],
        targetDescription: 'Ideal for brands ready to build a content library.',
        featured: true,
        badgeLabel: '★ Most Popular',
        ctaLabel: 'Get Started',
      },
      {
        _type: 'pricingPackage',
        _key: 'pkg3',
        name: 'Brand Pack',
        priceLabel: 'Starting at $320 USD',
        features: [
          '5 vertical videos',
          'Available in English, Portuguese & Spanish',
          '2 revision rounds each',
          'Delivered in 14 days',
        ],
        targetDescription:
          'Best for brands looking to scale across multiple markets.',
        featured: false,
        ctaLabel: 'Get Started',
      },
    ],
  })
  console.log('  ✅  pricing')

  // stats ────────────────────────────────────────────────────────────────────
  await client.createOrReplace({
    _type: 'stats',
    _id: 'stats',
    items: [
      { _type: 'statItem', _key: 'stat1', value: '50K', label: 'YouTube Subscribers' },
      { _type: 'statItem', _key: 'stat2', value: '7K',  label: 'TikTok Followers' },
      { _type: 'statItem', _key: 'stat3', value: '6K',  label: 'Instagram Followers' },
      { _type: 'statItem', _key: 'stat4', value: '3+',  label: 'Years Creating' },
      { _type: 'statItem', _key: 'stat5', value: '3',   label: 'Languages' },
    ],
  })
  console.log('  ✅  stats')

  // portfolio ────────────────────────────────────────────────────────────────
  const portfolioVideos = []
  if (video1Id && poster1Id) {
    portfolioVideos.push({
      _type: 'portfolioVideo',
      _key: 'vid1',
      label: 'Travel',
      videoFile: file(video1Id),
      posterImage: img(poster1Id),
    })
  }
  if (video2Id && poster2Id) {
    portfolioVideos.push({
      _type: 'portfolioVideo',
      _key: 'vid2',
      label: 'Beauty',
      videoFile: file(video2Id),
      posterImage: img(poster2Id),
    })
  }
  await client.createOrReplace({
    _type: 'portfolio',
    _id: 'portfolio',
    sectionTitle: 'Portfolio',
    videos: portfolioVideos,
  })
  console.log('  ✅  portfolio')

  // photography ──────────────────────────────────────────────────────────────
  const photoItems = [
    { id: photo1Id, alt: 'Photography by Bruna Barros' },
    { id: photo2Id, alt: 'Photography by Bruna Barros' },
    { id: photo3Id, alt: 'Photography by Bruna Barros' },
    { id: photo4Id, alt: 'Photography by Bruna Barros' },
  ]
  await client.createOrReplace({
    _type: 'photography',
    _id: 'photography',
    sectionTitle: 'Photography',
    photos: photoItems
      .filter(({ id }) => id)
      .map(({ id, alt }, i) => ({
        _type: 'image',
        _key: `photo${i + 1}`,
        asset: { _type: 'reference', _ref: id },
        alt,
      })),
  })
  console.log('  ✅  photography')

  // howItWorks ───────────────────────────────────────────────────────────────
  await client.createOrReplace({
    _type: 'howItWorks',
    _id: 'howItWorks',
    sectionTitle: 'How It Works',
    steps: [
      {
        _type: 'processStep',
        _key: 'step1',
        stepNumber: '01',
        title: 'Send the Brief',
        description:
          "Share your product, goals, and any creative direction you have in mind. I'm easy to communicate with and quick to respond.",
      },
      {
        _type: 'processStep',
        _key: 'step2',
        stepNumber: '02',
        title: 'I Handle Everything',
        description:
          'Concept, filming, and editing — I take care of it all and keep you updated throughout the process.',
      },
      {
        _type: 'processStep',
        _key: 'step3',
        stepNumber: '03',
        title: 'Ready to Publish',
        description:
          'You receive polished content ready to go live. Revision rounds are included as per your package.',
      },
    ],
  })
  console.log('  ✅  howItWorks')

  // contact ──────────────────────────────────────────────────────────────────
  await client.createOrReplace({
    _type: 'contact',
    _id: 'contact',
    heading: "Let's Work Together!",
    subheading: "If you have a project in mind, I'd love to hear from you.",
  })
  console.log('  ✅  contact')

  console.log('\n✨  Seed complete!')
  console.log('   Open your Studio and publish the documents to make them live.')
  console.log('   Run: cd studio && npm run dev\n')
}

seed().catch((err) => {
  console.error('\n❌  Seed failed:', err.message)
  process.exit(1)
})
