import { defineType, defineField } from 'sanity'

/**
 * Contact Section — the "Let's Work Together" section at the bottom.
 * Both the heading and subheading are translatable.
 * Email + social links come from Site Settings.
 */
export const contact = defineType({
  name: 'contact',
  title: 'Contact Section',
  type: 'document',
  __experimental_actions: ['update', 'publish'],
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'i18nString',
      description:
        'The main heading of the contact section (e.g. "Let\'s Work Together!").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'subheading',
      title: 'Subheading',
      type: 'i18nString',
      description:
        'A short line below the heading (e.g. "If you have a project in mind, I\'d love to hear from you.").',
    }),
  ],
  preview: {
    select: { title: 'heading.en' },
    prepare({ title }) {
      return { title: `Contact — ${title || 'Untitled'}` }
    },
  },
})
