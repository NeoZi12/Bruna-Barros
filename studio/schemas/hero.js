import { defineType, defineField } from 'sanity'

/**
 * Hero Section — the first thing visitors see at the top of the page.
 *
 * Contains the name heading, role subtitle, and profile photo.
 * Email and social links live in Site Settings so they only need
 * to be updated in one place.
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
      type: 'string',
      description: 'Displayed on the first line of the large heading.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'lastName',
      title: 'Last Name',
      type: 'string',
      description: 'Displayed on the second line of the large heading.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'role',
      title: 'Role / Subtitle',
      type: 'string',
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
      firstName: 'firstName',
      lastName: 'lastName',
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
