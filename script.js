// ── LANGUAGE SWITCHER ────────────────────────────────
// Path-based: "/" → en, "/pt" → pt, "/es" → es.
// Exposed on window so sanity-content.js can read it on initial load.
const SUPPORTED_LANGS = ['en', 'pt', 'es'];

window.getCurrentLang = function () {
  const seg = window.location.pathname.split('/').filter(Boolean)[0];
  return SUPPORTED_LANGS.includes(seg) ? seg : 'en';
};

function setLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  const newPath = lang === 'en' ? '/' : `/${lang}`;
  // Preserve the hash (e.g. "#about") so clicking EN/PT/ES while sitting on
  // a section anchor doesn't scroll the user back to the top.
  const hash = window.location.hash || '';
  window.history.pushState({ lang }, '', newPath + hash);
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

// Back/forward browser buttons: pick up the new URL's language.
window.addEventListener('popstate', () => {
  setLanguage(window.getCurrentLang());
});

// On first load, sync the <html lang> attr and UI strings with the URL.
// Sanity content loading itself is triggered by sanity-content.js's own init.
(function syncLangOnLoad() {
  const lang = window.getCurrentLang();
  document.documentElement.lang = lang;
  document.querySelectorAll('.lang-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.lang === lang);
  });
  if (typeof window.applyUIStrings === 'function') window.applyUIStrings(lang);
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
const navAnchors = {};
document.querySelectorAll('.nav-links a[href^="#"]').forEach(a => {
  navAnchors[a.getAttribute('href').slice(1)] = a;
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

// TASK 3 — Click override ─────────────────────────────
// On click: set the target link active immediately and hold the lock for
// 1 000 ms so the observer doesn't fight the smooth-scroll animation.
Object.entries(navAnchors).forEach(([id, anchor]) => {
  anchor.addEventListener('click', () => {
    setActive(id);
    scrollLock = true;
    clearTimeout(scrollLockTimer);
    scrollLockTimer = setTimeout(() => { scrollLock = false; }, 1000);
  });
});

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
}, {
  rootMargin: '-84px 0px -55% 0px',
  // Fine-grained thresholds so the ratio map updates frequently enough
  // to always crown the right section as sections slide through the zone.
  threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0]
});

['about', 'services', 'pricing', 'portfolio', 'contact'].forEach(id => {
  const section = document.getElementById(id);
  if (section) activeSectionObserver.observe(section);
});

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
