/**
 * ui-strings.js
 *
 * Hand-translated UI labels that are hardcoded in index.html and can't
 * sensibly come from Sanity (nav links, button text, etc.).
 *
 * Usage: each element in index.html that needs translation has a
 * data-i18n="section.key" attribute. applyUIStrings(lang) walks those
 * elements and swaps their text.
 *
 * Exposed as window.UI_STRINGS and window.applyUIStrings so script.js can
 * consume it without a module system.
 */

window.UI_STRINGS = {
  en: {
    nav: {
      about: 'About',
      services: 'Services',
      pricing: 'Pricing',
      portfolio: 'Portfolio',
      letsTalk: "Let's Talk",
    },
  },
  pt: {
    nav: {
      about: 'Sobre',
      services: 'Serviços',
      pricing: 'Preços',
      portfolio: 'Portfólio',
      letsTalk: 'Vamos Conversar',
    },
  },
  es: {
    nav: {
      about: 'Sobre Mí',
      services: 'Servicios',
      pricing: 'Precios',
      portfolio: 'Portafolio',
      letsTalk: 'Hablemos',
    },
  },
};

/**
 * Looks up a dotted key path ("nav.about") inside the table for the given lang,
 * falling back to English if the translation is missing.
 */
function lookupUIString(lang, dottedKey) {
  const parts = dottedKey.split('.');
  const read = (obj) => parts.reduce((acc, p) => (acc == null ? acc : acc[p]), obj);
  return read(window.UI_STRINGS[lang]) ?? read(window.UI_STRINGS.en) ?? '';
}

window.applyUIStrings = function (lang) {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const value = lookupUIString(lang, key);
    if (value) el.textContent = value;
  });
};
