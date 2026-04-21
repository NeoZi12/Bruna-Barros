import { defineType, defineField } from 'sanity'

/**
 * i18nPortableText — translatable rich text (bold + italic paragraphs).
 *
 * Used for the About bio, which needs <strong> and <em> marks.
 * Same lock/snapshot mechanic as i18nString, but each language is an array
 * of Portable Text blocks instead of a plain string.
 *
 * The snapshot stores a JSON-serialised string of the last auto-translated
 * blocks so the webhook can detect manual edits (plain comparison).
 */
const portableTextBlocks = [
  {
    type: 'block',
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
]

export const i18nPortableText = defineType({
  name: 'i18nPortableText',
  title: 'Translatable Rich Text',
  type: 'object',
  options: { collapsible: true, collapsed: false, columns: 1 },
  fields: [
    defineField({
      name: 'en',
      title: '🇬🇧 English (source)',
      type: 'array',
      of: portableTextBlocks,
      description: 'Edit this. Portuguese and Spanish fill in automatically after publish.',
    }),
    defineField({
      name: 'pt',
      title: '🇵🇹 Português',
      type: 'array',
      of: portableTextBlocks,
      description: 'Auto-translated from English unless locked.',
    }),
    defineField({
      name: 'ptLocked',
      title: 'Lock Portuguese (don\'t auto-translate)',
      type: 'boolean',
      description:
        'Turns on automatically if you edit the Portuguese text by hand. Turn it off to re-enable auto-translation.',
      initialValue: false,
    }),
    defineField({
      name: 'es',
      title: '🇪🇸 Español',
      type: 'array',
      of: portableTextBlocks,
      description: 'Auto-translated from English unless locked.',
    }),
    defineField({
      name: 'esLocked',
      title: 'Lock Spanish (don\'t auto-translate)',
      type: 'boolean',
      description:
        'Turns on automatically if you edit the Spanish text by hand. Turn it off to re-enable auto-translation.',
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
      const firstSpan = Array.isArray(en)
        ? (en[0]?.children || []).map((c) => c.text).join('')
        : ''
      return {
        title: firstSpan ? firstSpan.slice(0, 60) + (firstSpan.length > 60 ? '…' : '') : '(empty)',
      }
    },
  },
})
