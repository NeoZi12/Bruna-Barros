import { defineType, defineField } from 'sanity'

/**
 * i18nString — a translatable short text field (single line).
 *
 * Stores English (source) + Portuguese + Spanish. English is edited by the
 * client. PT and ES are auto-filled by the translation webhook after publish.
 *
 * The ptLocked / esLocked booleans prevent auto-translation from overwriting
 * a manually-edited translation. The webhook sets them automatically when it
 * detects the client changed PT or ES by hand; the client can also untoggle
 * them to re-enable auto-translation for that field.
 *
 * ptSnapshot / esSnapshot store the last auto-generated value so the webhook
 * can detect manual edits (current value !== snapshot → manual edit).
 */
export const i18nString = defineType({
  name: 'i18nString',
  title: 'Translatable Text',
  type: 'object',
  options: { collapsible: true, collapsed: false, columns: 1 },
  fields: [
    defineField({
      name: 'en',
      title: '🇬🇧 English (source)',
      type: 'string',
      description: 'Edit this. Portuguese and Spanish fill in automatically after publish.',
    }),
    defineField({
      name: 'pt',
      title: '🇵🇹 Português',
      type: 'string',
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
      type: 'string',
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
      type: 'string',
      hidden: true,
    }),
    defineField({
      name: 'esSnapshot',
      type: 'string',
      hidden: true,
    }),
  ],
  preview: {
    select: { en: 'en', pt: 'pt', es: 'es' },
    prepare({ en, pt, es }) {
      return {
        title: en || '(empty)',
        subtitle: [pt, es].filter(Boolean).join(' · ') || 'No translations yet',
      }
    },
  },
})
