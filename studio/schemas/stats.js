import { defineType, defineField } from 'sanity'

/**
 * Stats Bar — the dark row of numbers between Pricing and Portfolio.
 *
 * Each stat is a large value (e.g. "50K") paired with a label
 * (e.g. "YouTube Subscribers"). Update the numbers here whenever
 * your metrics change. Drag to reorder.
 */
export const stats = defineType({
  name: 'stats',
  title: 'Stats Bar',
  type: 'document',
  __experimental_actions: ['update', 'publish'],
  fields: [
    defineField({
      name: 'items',
      title: 'Stats',
      type: 'array',
      description: 'Each stat is a number + label pair. Drag to reorder.',
      of: [
        {
          type: 'object',
          name: 'statItem',
          title: 'Stat',
          fields: [
            defineField({
              name: 'value',
              title: 'Value',
              type: 'string',
              description:
                'The large metric displayed (e.g. "50K", "3+", "3").',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description:
                'The description shown below the number (e.g. "YouTube Subscribers").',
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: { title: 'value', subtitle: 'label' },
          },
        },
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Stats Bar' }
    },
  },
})
