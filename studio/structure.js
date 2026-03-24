/**
 * structure.js
 *
 * Custom desk structure for the Bruna Barros Studio.
 *
 * Every section of the website is a singleton — there is exactly one document
 * per section type. The structure below exposes each singleton as a direct
 * list item so editors never see a "New document" button for these types.
 *
 * Opening any item takes you straight to that section's editing form.
 */

export const deskStructure = (S) =>
  S.list()
    .title('Website Content')
    .items([

      // ── Global settings ──────────────────────────────────────────────────
      S.listItem()
        .title('Site Settings')
        .id('siteSettings')
        .child(
          S.document()
            .title('Site Settings')
            .schemaType('siteSettings')
            .documentId('siteSettings'),
        ),

      S.divider(),

      // ── Page sections (top to bottom on the website) ─────────────────────
      S.listItem()
        .title('Hero')
        .id('hero')
        .child(
          S.document()
            .title('Hero')
            .schemaType('hero')
            .documentId('hero'),
        ),

      S.listItem()
        .title('About')
        .id('about')
        .child(
          S.document()
            .title('About')
            .schemaType('about')
            .documentId('about'),
        ),

      S.listItem()
        .title('Services')
        .id('services')
        .child(
          S.document()
            .title('Services')
            .schemaType('services')
            .documentId('services'),
        ),

      S.listItem()
        .title('Pricing')
        .id('pricing')
        .child(
          S.document()
            .title('Pricing')
            .schemaType('pricing')
            .documentId('pricing'),
        ),

      S.divider(),

      S.listItem()
        .title('Stats Bar')
        .id('stats')
        .child(
          S.document()
            .title('Stats Bar')
            .schemaType('stats')
            .documentId('stats'),
        ),

      S.listItem()
        .title('Portfolio Videos')
        .id('portfolio')
        .child(
          S.document()
            .title('Portfolio Videos')
            .schemaType('portfolio')
            .documentId('portfolio'),
        ),

      S.listItem()
        .title('Photography Gallery')
        .id('photography')
        .child(
          S.document()
            .title('Photography Gallery')
            .schemaType('photography')
            .documentId('photography'),
        ),

      S.divider(),

      S.listItem()
        .title('How It Works')
        .id('howItWorks')
        .child(
          S.document()
            .title('How It Works')
            .schemaType('howItWorks')
            .documentId('howItWorks'),
        ),

      S.listItem()
        .title('Contact')
        .id('contact')
        .child(
          S.document()
            .title('Contact')
            .schemaType('contact')
            .documentId('contact'),
        ),
    ])
