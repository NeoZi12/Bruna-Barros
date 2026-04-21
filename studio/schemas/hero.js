import { defineType, defineField } from 'sanity'

/**
 * Hero Section — the first thing visitors see at the top of the page.
 *
 * firstName, lastName are translatable (some names transliterate differently
 * in Portuguese / Spanish contexts, so we let the translator handle it).
 * The role / subtitle is translatable. The hero image is not.
 */
export const hero = defineType({
  name: 'hero',
  title: 'Hero Section',
  type: 'document',
  __experimental_actions: ['update', 'publish'],
  fields: [
    defineField({
      name: 'firstName',
      title: 'First Name',
      type: 'i18nString',
      description: 'Displayed on the first line of the large heading.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'lastName',
      title: 'Last Name',
      type: 'i18nString',
      description: 'Displayed on the second line of the large heading.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'role',
      title: 'Role / Subtitle',
      type: 'i18nString',
      description:
        'Shown under the name (e.g. "UGC Creator & Content Creator"). Use & for the styled ampersand.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'heroImage',
      title: 'Profile Photo',
      type: 'image',
      description: 'Portrait photo shown on the left side of the hero section.',
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      firstName: 'firstName.en',
      lastName: 'lastName.en',
      media: 'heroImage',
    },
    prepare({ firstName, lastName, media }) {
      return {
        title: `Hero — ${firstName || ''} ${lastName || ''}`.trim(),
        media,
      }
    },
  },
})
