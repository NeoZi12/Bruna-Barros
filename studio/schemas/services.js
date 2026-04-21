import { defineType, defineField } from 'sanity'

/**
 * Services Section — the "What I Create" card grid.
 * Each card's title + description are translatable. Drag to reorder.
 */
export const services = defineType({
  name: 'services',
  title: 'Services Section',
  type: 'document',
  __experimental_actions: ['update', 'publish'],
  fields: [
    defineField({
      name: 'sectionTitle',
      title: 'Section Title',
      type: 'i18nString',
      description: 'Heading shown above the service cards (e.g. "What I Create").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'items',
      title: 'Service Cards',
      type: 'array',
      description: 'Each card represents one type of content you offer. Drag to reorder.',
      of: [
        {
          type: 'object',
          name: 'serviceCard',
          title: 'Service Card',
          fields: [
            defineField({
              name: 'title',
              title: 'Service Title',
              type: 'i18nString',
              description: 'Short name of the service (e.g. "Travel & Airbnb Content").',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'description',
              title: 'Description',
              type: 'i18nText',
              description: 'A brief description of what this service includes.',
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: { title: 'title.en', subtitle: 'description.en' },
            prepare({ title, subtitle }) {
              return {
                title: title || '(untitled)',
                subtitle: subtitle ? subtitle.substring(0, 70) + '…' : '',
              }
            },
          },
        },
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
  preview: {
    select: { title: 'sectionTitle.en' },
    prepare({ title }) {
      return { title: `Services — ${title || 'Untitled'}` }
    },
  },
})
