import { defineType, defineField } from 'sanity'

/**
 * i18nText — like i18nString but uses a multi-line textarea for each language.
 * Use this for longer descriptions (2+ sentences). Same lock/snapshot mechanic.
 */
export const i18nText = defineType({
  name: 'i18nText',
  title: 'Translatable Long Text',
  type: 'object',
  options: { collapsible: true, collapsed: false, columns: 1 },
  fields: [
    defineField({
      name: 'en',
      title: '🇬🇧 English (source)',
      type: 'text',
      rows: 3,
      description: 'Edit this. Portuguese and Spanish fill in automatically after publish.',
    }),
    defineField({
      name: 'pt',
      title: '🇵🇹 Português',
      type: 'text',
      rows: 3,
      description: 'Auto-translated from English unless locked.',
    }),
    defineField({
      name: 'ptLocked',
      title: 'Lock Portuguese (don\'t auto-translate)',
      type: 'boolean',
      description:
        'Turns on automatically if you edit the Portuguese text by hand. Turn it off to re-enable auto-translation for this field.',
      initialValue: false,
    }),
    defineField({
      name: 'es',
      title: '🇪🇸 Español',
      type: 'text',
      rows: 3,
      description: 'Auto-translated from English unless locked.',
    }),
    defineField({
      name: 'esLocked',
      title: 'Lock Spanish (don\'t auto-translate)',
      type: 'boolean',
      description:
        'Turns on automatically if you edit the Spanish text by hand. Turn it off to re-enable auto-translation for this field.',
      initialValue: false,
    }),
    defineField({
      name: 'ptSnapshot',
      type: 'text',
      hidden: true,
    }),
    defineField({
      name: 'esSnapshot',
      type: 'text',
      hidden: true,
    }),
  ],
  preview: {
    select: { en: 'en' },
    prepare({ en }) {
      return {
        title: en ? en.slice(0, 60) + (en.length > 60 ? '…' : '') : '(empty)',
      }
    },
  },
})
