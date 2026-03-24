import { defineType, defineField } from 'sanity'

/**
 * Site Settings — global data shared across sections.
 *
 * Stores the contact email, social links, navbar brand name, and footer text.
 * Changing these here updates every part of the website that displays them,
 * so you only need to update one place when your email or social handles change.
 */
export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  // Prevent creating or deleting — there should only ever be one of these.
  __experimental_actions: ['update', 'publish'],
  fields: [
    defineField({
      name: 'brandName',
      title: 'Brand Name',
      type: 'string',
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
      type: 'string',
      description:
        'Copyright line at the very bottom of the page (e.g. "© 2026 Bruna Barros. All rights reserved.").',
    }),
  ],
  preview: {
    select: { title: 'brandName' },
    prepare({ title }) {
      return { title: `Site Settings — ${title || 'Untitled'}` }
    },
  },
})
