import { defineType, defineField } from 'sanity'

/**
 * How It Works — the numbered process steps section.
 *
 * Each step has a display number, a short title, and a description.
 * Drag to reorder steps.
 */
export const howItWorks = defineType({
  name: 'howItWorks',
  title: 'How It Works',
  type: 'document',
  __experimental_actions: ['update', 'publish'],
  fields: [
    defineField({
      name: 'sectionTitle',
      title: 'Section Title',
      type: 'string',
      description: 'Heading shown above the steps (e.g. "How It Works").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'steps',
      title: 'Process Steps',
      type: 'array',
      description:
        'The numbered steps explaining your process. Drag to reorder.',
      of: [
        {
          type: 'object',
          name: 'processStep',
          title: 'Step',
          fields: [
            defineField({
              name: 'stepNumber',
              title: 'Step Number',
              type: 'string',
              description: 'The display number (e.g. "01", "02", "03").',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'title',
              title: 'Step Title',
              type: 'string',
              description: 'Short title of this step (e.g. "Send the Brief").',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'description',
              title: 'Description',
              type: 'text',
              rows: 3,
              description: 'A couple of sentences explaining what happens in this step.',
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: { num: 'stepNumber', title: 'title' },
            prepare({ num, title }) {
              return { title: `Step ${num} — ${title}` }
            },
          },
        },
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
  preview: {
    select: { title: 'sectionTitle' },
    prepare({ title }) {
      return { title: `How It Works — ${title || 'Untitled'}` }
    },
  },
})
