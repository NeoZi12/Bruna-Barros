import { defineType, defineField } from 'sanity'

/**
 * Stats Bar — the dark row of numbers.
 * The value ("50K") is language-neutral; the label ("YouTube Subscribers") is translatable.
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
                'The large metric displayed (e.g. "50K", "3+", "3"). Same in all languages.',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'label',
              title: 'Label',
              type: 'i18nString',
              description:
                'The description shown below the number (e.g. "YouTube Subscribers").',
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: { title: 'value', subtitle: 'label.en' },
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
