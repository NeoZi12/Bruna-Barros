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

// ── PORTFOLIO VIDEO CONTROLS ──────────────────────────
const SVG_PLAY  = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="7,3 21,12 7,21" fill="white"/></svg>`;
const SVG_PAUSE = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="3" width="4" height="18" rx="1.5" fill="white"/><rect x="15" y="3" width="4" height="18" rx="1.5" fill="white"/></svg>`;

document.querySelectorAll('.phone-screen').forEach(screen => {
  const video    = screen.querySelector('video');
  const controls = screen.querySelector('.video-controls');
  if (!video || !controls) return;

  const playBtn  = controls.querySelector('.ctrl-play-btn');
  const progress = controls.querySelector('.ctrl-progress');
  const volBtn   = controls.querySelector('.ctrl-vol-btn');
  const volBar   = controls.querySelector('.ctrl-vol-bar');

  const SVG_VOL_ON  = `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
  const SVG_VOL_OFF = `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;

  // Initial UI state — video starts muted, so bar and icon reflect silence
  playBtn.innerHTML = SVG_PLAY;
  volBtn.innerHTML  = SVG_VOL_OFF;
  volBar.value      = 0;

  // Show first frame on iOS: play+pause on canplay (requires muted attribute)
  let firstFrameShown = false;
  video.addEventListener('canplay', () => {
    if (firstFrameShown) return;
    firstFrameShown = true;
    video.play().then(() => video.pause()).catch(() => {});
  });

  // Auto-hide play button 2s after video starts playing
  let hideTimer = null;

  const showBtn = () => { playBtn.classList.remove('btn-hidden'); };
  const hideBtn = () => { playBtn.classList.add('btn-hidden'); };

  // Any touch on the screen: show the button and restart the 2s timer
  controls.addEventListener('touchstart', () => {
    clearTimeout(hideTimer);
    showBtn();
    if (!video.paused) {
      hideTimer = setTimeout(hideBtn, 2000);
    }
  }, { passive: true });

  // Tracks whether the user has ever deliberately touched the volume controls.
  // While false, the first play-tap auto-unmutes the video to full volume.
  let hasInteractedWithVolume = false;
  let lastTouchTime = 0;

  // Keep touchend only for lastTouchTime tracking (used by volBtn click guard)
  controls.addEventListener('touchend', (e) => {
    if (e.target === progress || e.target === volBar ||
        e.target === volBtn || e.target.closest('.ctrl-vol-btn') ||
        e.target.closest('.ctrl-bottom')) return;
    lastTouchTime = Date.now();
  }, { passive: true });

  // Click handler — handles both desktop clicks and iOS synthetic clicks from taps
  controls.addEventListener('click', (e) => {
    if (e.target === progress || e.target === volBar || e.target === volBtn) return;
    e.preventDefault();

    // Auto-unmute on first tap: only fires once, and only if the user has
    // never manually adjusted volume (so we don't fight their preference).
    if (video.muted && !hasInteractedWithVolume) {
      video.muted  = false;
      video.volume = 0.5;
      volBar.value = 0.5;
      volBtn.innerHTML = SVG_VOL_ON;
      hasInteractedWithVolume = true;
    }

    if (video.paused) { video.play(); } else { video.pause(); }
  });

  video.addEventListener('play',  () => { playBtn.innerHTML = SVG_PAUSE; clearTimeout(hideTimer); hideTimer = setTimeout(hideBtn, 2000); });
  video.addEventListener('pause', () => { playBtn.innerHTML = SVG_PLAY;  clearTimeout(hideTimer); showBtn(); });
  video.addEventListener('ended', () => { playBtn.innerHTML = SVG_PLAY;  clearTimeout(hideTimer); showBtn(); });

  // Seek bar
  video.addEventListener('timeupdate', () => {
    if (!video.duration) return;
    progress.value = (video.currentTime / video.duration) * 100;
  });
  progress.addEventListener('input', () => {
    if (!video.duration) return;
    video.currentTime = (progress.value / 100) * video.duration;
  });

  // Volume slider — user dragged, so lock in their choice
  volBar.addEventListener('input', () => {
    hasInteractedWithVolume = true;
    video.volume = volBar.value;
    video.muted  = (volBar.value == 0);
    volBtn.innerHTML = video.muted ? SVG_VOL_OFF : SVG_VOL_ON;
  });

  // Mute/unmute button (touch)
  volBtn.addEventListener('touchend', (e) => {
    e.stopPropagation();
    hasInteractedWithVolume = true;
    video.muted = !video.muted;
    volBtn.innerHTML = video.muted ? SVG_VOL_OFF : SVG_VOL_ON;
    volBar.value = video.muted ? 0 : (video.volume || 1);
  }, { passive: true });

  // Mute/unmute button (desktop click, deduplicated from touch)
  volBtn.addEventListener('click', (e) => {
    if (Date.now() - lastTouchTime < 500) return;
    e.preventDefault();
    hasInteractedWithVolume = true;
    video.muted = !video.muted;
    volBtn.innerHTML = video.muted ? SVG_VOL_OFF : SVG_VOL_ON;
    volBar.value = video.muted ? 0 : (video.volume || 1);
  });
});

// ── VIDEO PAUSE WHEN OFF-SCREEN ──────────────────────
// WeakMap tracks videos the observer auto-paused (vs user-paused).
// On re-entry we only resume if *we* were the one who paused it.
const observerPaused = new WeakMap();

const videoVisibilityObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const video = entry.target.querySelector('video');
    if (!video) return;
    if (entry.isIntersecting) {
      // Came back into view — resume only if observer paused it
      if (observerPaused.get(video)) {
        video.play().catch(() => {});
        observerPaused.set(video, false);
      }
    } else {
      // Left viewport — pause only if currently playing
      if (!video.paused) {
        video.pause();
        observerPaused.set(video, true);
      }
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.portfolio-phone').forEach(phone => {
  videoVisibilityObserver.observe(phone);
});

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
