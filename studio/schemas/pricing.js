import { defineType, defineField } from 'sanity'

/**
 * Pricing Section — the three-column pricing table.
 *
 * Every text field (name, price label, features, CTA) is translatable.
 * Numbers-only fields don't exist here — prices are strings with currency.
 * The "featured" boolean is language-neutral.
 */
export const pricing = defineType({
  name: 'pricing',
  title: 'Pricing Section',
  type: 'document',
  __experimental_actions: ['update', 'publish'],
  fields: [
    defineField({
      name: 'sectionTitle',
      title: 'Section Title',
      type: 'i18nString',
      description: 'Heading shown above the pricing table (e.g. "Pricing").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'introText',
      title: 'Intro Text',
      type: 'i18nText',
      description: 'Small text shown below the heading, above the pricing columns.',
    }),
    defineField({
      name: 'packages',
      title: 'Pricing Packages',
      type: 'array',
      description:
        'Your pricing tiers. Mark one as Featured to highlight it. Drag to reorder.',
      of: [
        {
          type: 'object',
          name: 'pricingPackage',
          title: 'Package',
          fields: [
            defineField({
              name: 'name',
              title: 'Package Name',
              type: 'i18nString',
              description: 'e.g. "Starter", "Core", "Brand Pack"',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'priceLabel',
              title: 'Price Label',
              type: 'i18nString',
              description:
                'Displayed as the main price line (e.g. "Starting at $75 USD").',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'features',
              title: 'Features / Deliverables',
              type: 'array',
              description: 'List each feature or deliverable as a separate item.',
              of: [{ type: 'i18nString' }],
              validation: (Rule) => Rule.required().min(1),
            }),
            defineField({
              name: 'targetDescription',
              title: 'Who It\'s For',
              type: 'i18nString',
              description:
                'A short sentence describing who this package suits best (shown below the feature list).',
            }),
            defineField({
              name: 'featured',
              title: 'Featured (Most Popular)',
              type: 'boolean',
              description:
                'Toggle on to give this package the highlighted style and badge.',
              initialValue: false,
            }),
            defineField({
              name: 'badgeLabel',
              title: 'Badge Label',
              type: 'i18nString',
              description:
                'Only used when Featured is on. Defaults to "★ Most Popular" if left blank.',
              hidden: ({ parent }) => !parent?.featured,
            }),
            defineField({
              name: 'ctaLabel',
              title: 'Button Label',
              type: 'i18nString',
              description: 'Text on the call-to-action button (e.g. "Get Started").',
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: {
              name: 'name.en',
              price: 'priceLabel.en',
              featured: 'featured',
            },
            prepare({ name, price, featured }) {
              return {
                title: featured ? `★ ${name || ''}` : name || '(unnamed)',
                subtitle: price,
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
      return { title: `Pricing — ${title || 'Untitled'}` }
    },
  },
})
