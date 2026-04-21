import { i18nString } from './objects/i18nString.js'
import { i18nText } from './objects/i18nText.js'
import { i18nPortableText } from './objects/i18nPortableText.js'

import { siteSettings } from './siteSettings.js'
import { hero } from './hero.js'
import { about } from './about.js'
import { services } from './services.js'
import { pricing } from './pricing.js'
import { stats } from './stats.js'
import { portfolio } from './portfolio.js'
import { photography } from './photography.js'
import { howItWorks } from './howItWorks.js'
import { contact } from './contact.js'

export const schemaTypes = [
  // Shared translatable field types (used by every document below)
  i18nString,
  i18nText,
  i18nPortableText,
  // Document types
  siteSettings,
  hero,
  about,
  services,
  pricing,
  stats,
  portfolio,
  photography,
  howItWorks,
  contact,
]
