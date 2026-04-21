import { defineType, defineField } from 'sanity'

/**
 * Photography Gallery — the 4-column dark photo grid.
 * Alt text is translatable (important for accessibility in each language).
 */
export const photography = defineType({
  name: 'photography',
  title: 'Photography Gallery',
  type: 'document',
  __experimental_actions: ['update', 'publish'],
  fields: [
    defineField({
      name: 'sectionTitle',
      title: 'Section Title',
      type: 'i18nString',
      description: 'Heading shown above the photo grid (e.g. "Photography").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'photos',
      title: 'Photos',
      type: 'array',
      description:
        'Photos displayed in the grid. Upload images and add alt text for each. Drag to reorder.',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt Text',
              type: 'i18nString',
              description:
                'Describe what\'s in the photo — used for accessibility and SEO. Translated to each language.',
              isHighlighted: true,
              validation: (Rule) =>
                Rule.required().warning('Alt text is required for accessibility.'),
            }),
          ],
        },
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
  preview: {
    select: { title: 'sectionTitle.en' },
    prepare({ title }) {
      return { title: `Photography — ${title || 'Untitled'}` }
    },
  },
})
