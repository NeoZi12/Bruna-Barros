import { defineType, defineField } from 'sanity'

/**
 * Site Settings — global data shared across sections.
 *
 * brandName and footerText are translatable (EN + auto-translated PT/ES).
 * Email and social URLs are language-neutral.
 */
export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  __experimental_actions: ['update', 'publish'],
  fields: [
    defineField({
      name: 'brandName',
      title: 'Brand Name',
      type: 'i18nString',
      description: 'Shown in the top-left of the navigation bar.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'email',
      title: 'Contact Email',
      type: 'string',
      description:
        'Your contact email address. Appears in the hero section and the Contact section.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'instagramUrl',
      title: 'Instagram URL',
      type: 'url',
      description: 'Full URL to your Instagram profile (e.g. https://www.instagram.com/yourname/).',
    }),
    defineField({
      name: 'youtubeUrl',
      title: 'YouTube URL',
      type: 'url',
      description: 'Full URL to your YouTube channel.',
    }),
    defineField({
      name: 'tiktokUrl',
      title: 'TikTok URL',
      type: 'url',
      description: 'Full URL to your TikTok profile.',
    }),
    defineField({
      name: 'footerText',
      title: 'Footer Text',
      type: 'i18nString',
      description:
        'Copyright line at the very bottom of the page (e.g. "© 2026 Bruna Barros. All rights reserved.").',
    }),
  ],
  preview: {
    select: { title: 'brandName.en' },
    prepare({ title }) {
      return { title: `Site Settings — ${title || 'Untitled'}` }
    },
  },
})
