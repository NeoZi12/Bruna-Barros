import { defineType, defineField } from 'sanity'

/**
 * About Section — the bio section below the hero.
 *
 * The body field is rich text that supports bold and italic formatting.
 * Each paragraph is a separate block — click Enter to start a new one.
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
      type: 'string',
      description: 'The main heading of the About section (e.g. "Hi, I\'m Bruna!").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Bio Text',
      type: 'array',
      description:
        'Your biography. Supports bold and italic formatting. Each paragraph is a separate block.',
      of: [
        {
          type: 'block',
          // Restrict styles to paragraphs only — no h1/h2 etc. in a bio
          styles: [{ title: 'Normal', value: 'normal' }],
          lists: [],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
            ],
            annotations: [],
          },
        },
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
  preview: {
    select: { title: 'heading' },
    prepare({ title }) {
      return { title: `About — ${title || 'Untitled'}` }
    },
  },
})
