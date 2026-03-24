import { defineType, defineField } from 'sanity'

/**
 * Portfolio Videos — the phone mockup video showcase.
 *
 * Each video appears inside a phone frame. Upload the .mp4 file and
 * a poster/thumbnail image. The label appears below the phone frame.
 * Drag to reorder videos.
 */
export const portfolio = defineType({
  name: 'portfolio',
  title: 'Portfolio Videos',
  type: 'document',
  __experimental_actions: ['update', 'publish'],
  fields: [
    defineField({
      name: 'sectionTitle',
      title: 'Section Title',
      type: 'string',
      description: 'Heading shown above the portfolio (e.g. "Portfolio").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'videos',
      title: 'Portfolio Videos',
      type: 'array',
      description:
        'Videos displayed inside phone mockup frames. Upload .mp4 files and poster images. Drag to reorder.',
      of: [
        {
          type: 'object',
          name: 'portfolioVideo',
          title: 'Video',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description:
                'Short label shown below the phone frame (e.g. "Travel", "Beauty").',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'videoFile',
              title: 'Video File',
              type: 'file',
              description: 'Upload the .mp4 video file.',
              options: { accept: 'video/*' },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'posterImage',
              title: 'Poster / Thumbnail',
              type: 'image',
              description: 'Thumbnail shown before the video plays.',
              options: { hotspot: true },
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: {
              title: 'label',
              media: 'posterImage',
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
      return { title: `Portfolio — ${title || 'Untitled'}` }
    },
  },
})
