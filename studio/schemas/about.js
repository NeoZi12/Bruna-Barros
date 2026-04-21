import { defineType, defineField } from 'sanity'

/**
 * About Section — the bio section below the hero.
 *
 * The body is rich text with bold + italic. Uses i18nPortableText so each
 * language has its own array of blocks, preserving paragraph structure.
 */
export const about = defineType({
  name: 'about',
  title: 'About Section',
  type: 'document',
  __experimental_actions: ['update', 'publish'],
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'i18nString',
      description: 'The main heading of the About section (e.g. "Hi, I\'m Bruna!").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Bio Text',
      type: 'i18nPortableText',
      description:
        'Your biography. Supports bold and italic formatting. Each paragraph is a separate block.',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { title: 'heading.en' },
    prepare({ title }) {
      return { title: `About — ${title || 'Untitled'}` }
    },
  },
})
