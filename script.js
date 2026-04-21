// ── ROUTING: sections in path, language in query ─────
// Path: "/" → hero, "/about" | "/services" | "/pricing" | "/portfolio" | "/contact" → sections.
// Query: "?lang=pt" | "?lang=es"; EN is implicit (no param).
const SUPPORTED_LANGS = ['en', 'pt', 'es'];
const SECTION_PATHS   = ['about', 'services', 'pricing', 'portfolio', 'contact'];

window.getCurrentLang = function () {
  const lang = new URLSearchParams(window.location.search).get('lang');
  return SUPPORTED_LANGS.includes(lang) ? lang : 'en';
};

function getCurrentSection() {
  const seg = window.location.pathname.split('/').filter(Boolean)[0];
  return SECTION_PATHS.includes(seg) ? seg : null; // null = hero/top
}

function buildUrl(section, lang) {
  const path = section ? `/${section}` : '/';
  const qs   = lang && lang !== 'en' ? `?lang=${lang}` : '';
  return path + qs;
}

function setLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  const url = buildUrl(getCurrentSection(), lang);
  if (url !== window.location.pathname + window.location.search) {
    window.history.pushState({ lang }, '', url);
  }
  document.documentElement.lang = lang;
  document.querySelectorAll('.lang-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.lang === lang);
  });
  if (typeof window.applyUIStrings === 'function') window.applyUIStrings(lang);
  if (typeof window.loadSanityContent === 'function') window.loadSanityContent(lang);
}

document.querySelectorAll('.lang-btn').forEach((btn) => {
  btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
});

function scrollToSection(section, behavior = 'smooth') {
  const el = section ? document.getElementById(section) : null;
  if (el) {
    el.scrollIntoView({ behavior, block: 'start' });
  } else if (!section) {
    window.scrollTo({ top: 0, behavior });
  }
}

// Back/forward browser buttons: re-apply lang and scroll to the URL's section.
window.addEventListener('popstate', () => {
  setLanguage(window.getCurrentLang());
  scrollToSection(getCurrentSection());
});

// On first load, sync the <html lang> attr and UI strings with the URL,
// and jump to the section encoded in the path (if any).
// Sanity content loading itself is triggered by sanity-content.js's own init.
(function syncLangOnLoad() {
  const lang = window.getCurrentLang();
  document.documentElement.lang = lang;
  document.querySelectorAll('.lang-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.lang === lang);
  });
  if (typeof window.applyUIStrings === 'function') window.applyUIStrings(lang);

  const initialSection = getCurrentSection();
  if (initialSection) {
    // Defer until after layout so smooth-scroll targets the right offset.
    window.addEventListener('load', () => scrollToSection(initialSection, 'auto'));
  }
})();

// ── MOBILE NAV TOGGLE ────────────────────────────────
const toggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

toggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  toggle.classList.toggle('open', isOpen);
  toggle.setAttribute('aria-expanded', isOpen);
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', false);
  });
});

// ── NAVBAR SCROLL SHADOW ─────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// ── VIDEO PAUSE WHEN OFF-SCREEN (Vidstack API) ───────
// WeakMap tracks players the observer auto-paused (vs user-paused).
// On re-entry we only resume if *we* were the one who paused it.
const observerPaused = new WeakMap();

const videoVisibilityObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const player = entry.target.querySelector('media-player');
    if (!player) return;
    if (entry.isIntersecting) {
      // Came back into view — resume only if observer paused it
      if (observerPaused.get(player)) {
        player.play().catch(() => {});
        observerPaused.set(player, false);
      }
    } else {
      // Left viewport — pause only if currently playing
      if (!player.paused) {
        player.pause();
        observerPaused.set(player, true);
      }
    }
  });
}, { threshold: 0.5 });

// Exposed globally so sanity-content.js can re-observe newly injected phones
// after the portfolio grid is rebuilt from CMS data.
window.observePortfolioPhones = () => {
  document.querySelectorAll('.portfolio-phone').forEach(phone => {
    videoVisibilityObserver.observe(phone);
  });
};

// Observe the phones present in the initial static HTML.
window.observePortfolioPhones();

// ── ACTIVE NAV ON SCROLL ─────────────────────────────
// Build a map of section-id → nav anchor element once at startup.
// Nav anchors now use path hrefs (e.g. "/about") — strip the leading slash.
const navAnchors = {};
document.querySelectorAll('.nav-links a[data-section]').forEach(a => {
  navAnchors[a.dataset.section] = a;
});

// Track live intersection ratios for every observed section so we can
// always pick the one most visible inside the detection zone.
const visibleRatios = new Map();

// While scrollLock is true (e.g. right after a nav click) the observer
// callback is a no-op, preventing flicker during the smooth-scroll.
let scrollLock    = false;
let scrollLockTimer = null;

function setActive(id) {
  Object.values(navAnchors).forEach(a => a.classList.remove('active'));
  if (navAnchors[id]) navAnchors[id].classList.add('active');
}

function syncUrlToSection(section, { push = false } = {}) {
  const url = buildUrl(section, window.getCurrentLang());
  const current = window.location.pathname + window.location.search;
  if (url === current) return;
  if (push) window.history.pushState(null, '', url);
  else      window.history.replaceState(null, '', url);
}

// Click override ─────────────────────────────────────
// Intercept any in-page section link (nav links, pricing CTAs, brand).
// Prevent full navigation, pushState the new URL, smooth-scroll to the
// section, and hold the scroll lock for 1 000 ms so the observer doesn't
// fight the smooth-scroll animation.
function handleSectionClick(section) {
  return (e) => {
    e.preventDefault();
    setActive(section);
    syncUrlToSection(section, { push: true });
    scrollToSection(section);
    scrollLock = true;
    clearTimeout(scrollLockTimer);
    scrollLockTimer = setTimeout(() => { scrollLock = false; }, 1000);
  };
}

document.querySelectorAll('a[data-section]').forEach(a => {
  a.addEventListener('click', handleSectionClick(a.dataset.section));
});

// Brand link ("Bruna Barros") — href="/", no data-section → hero / root.
const brandLink = document.querySelector('.nav-brand');
if (brandLink) {
  brandLink.addEventListener('click', handleSectionClick(null));
}

// TASK 2 — Intersection Observer ──────────────────────
// rootMargin carves out a detection band: below the fixed navbar (84 px)
// down to roughly the upper 45 % of the viewport.  In most cases only one
// section occupies that band at a time.  When two sections do overlap
// (e.g. a very short section), we pick the one with the highest ratio.
// Multiple thresholds give us ratio updates as the section moves through
// the band, so the "best" pick stays accurate throughout the scroll.
const activeSectionObserver = new IntersectionObserver((entries) => {
  if (scrollLock) return;

  // Update the live-ratio map: add/refresh intersecting, remove leaving.
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      visibleRatios.set(entry.target.id, entry.intersectionRatio);
    } else {
      visibleRatios.delete(entry.target.id);
    }
  });

  if (visibleRatios.size === 0) return;

  // Pick the section with the greatest intersection ratio in the zone.
  let bestId    = null;
  let bestRatio = -1;
  visibleRatios.forEach((ratio, id) => {
    if (ratio > bestRatio) { bestRatio = ratio; bestId = id; }
  });

  setActive(bestId);
  syncUrlToSection(bestId);
}, {
  rootMargin: '-84px 0px -55% 0px',
  // Fine-grained thresholds so the ratio map updates frequently enough
  // to always crown the right section as sections slide through the zone.
  threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0]
});

SECTION_PATHS.forEach(id => {
  const section = document.getElementById(id);
  if (section) activeSectionObserver.observe(section);
});

// The intersection observer misses two cases: above the first section
// (empty visibleRatios, URL stays stale) and near the very bottom of the
// document when the last section (contact) is short enough that it never
// fills the detection band. Handle both here.
window.addEventListener('scroll', () => {
  if (scrollLock) return;
  if (window.scrollY < 120 && visibleRatios.size === 0) {
    setActive(null);
    syncUrlToSection(null);
    return;
  }
  const contact = document.getElementById('contact');
  if (contact) {
    const rect = contact.getBoundingClientRect();
    // Contact's top has crossed into the lower portion of the viewport and
    // nothing else is dominating the detection band — we're at the bottom.
    if (rect.top < window.innerHeight * 0.75 && rect.top > 0 && visibleRatios.size === 0) {
      setActive('contact');
      syncUrlToSection('contact');
    }
  }
}, { passive: true });

// ── FADE-IN ON SCROLL ────────────────────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(
  '.about-grid, .why-grid, .services-grid, .stats-grid, ' +
  '.portfolio-grid, .steps-grid, .section-contact h2, ' +
  '.section-contact p, .section-contact .btn-outline'
).forEach(el => {
  el.classList.add('fade-in');
  observer.observe(el);
});
