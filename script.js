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
  const player   = screen.querySelector('media-player');
  const controls = screen.querySelector('.video-controls');
  if (!player || !controls) return;

  const playBtn  = controls.querySelector('.ctrl-play-btn');
  const progress = controls.querySelector('.ctrl-progress');
  const volBtn   = controls.querySelector('.ctrl-vol-btn');
  const volBar   = controls.querySelector('.ctrl-vol-bar');

  const SVG_VOL_ON  = `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
  const SVG_VOL_OFF = `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;

  // Initial UI state — player starts paused & muted, showing the poster
  playBtn.innerHTML = SVG_PLAY;
  volBtn.innerHTML  = SVG_VOL_OFF;
  volBar.value      = 0;

  // Auto-hide play button 2s after playback starts
  let hideTimer = null;

  const showBtn = () => { playBtn.classList.remove('btn-hidden'); };
  const hideBtn = () => { playBtn.classList.add('btn-hidden'); };

  // Any touch on the screen: show the button and restart the 2s timer
  controls.addEventListener('touchstart', () => {
    clearTimeout(hideTimer);
    showBtn();
    if (!player.paused) {
      hideTimer = setTimeout(hideBtn, 2000);
    }
  }, { passive: true });

  // Tracks whether the user has ever deliberately touched the volume controls.
  // While false, the first play-tap Smart Unmutes to 50% volume.
  let hasInteractedWithVolume = false;
  let lastTouchTime = 0;

  // Last known non-zero volume — restored when the user unmutes.
  // Defaults to 0.5 so the very first unmute lands at a comfortable level.
  let lastVolume = 0.5;

  // Keep touchend only for lastTouchTime tracking (used by volBtn click guard)
  controls.addEventListener('touchend', (e) => {
    // If touch ended inside any volume control or the seek bar, bail out
    if (e.target.closest('.ctrl-volume') || e.target.closest('.ctrl-bottom')) return;
    lastTouchTime = Date.now();
  }, { passive: true });

  // ── PLAY/PAUSE CLICK HANDLER ────────────────────────
  // Uses .closest() so clicks on SVG children inside the volume button
  // or seek bar are correctly excluded — not just the exact target element.
  controls.addEventListener('click', (e) => {
    if (e.target.closest('.ctrl-volume') || e.target.closest('.ctrl-bottom')) return;
    e.preventDefault();

    // Smart Unmute: fires once on first tap if user hasn't touched volume manually
    if (player.muted && !hasInteractedWithVolume) {
      player.muted  = false;
      player.volume = 0.5;
      lastVolume    = 0.5;
      volBar.value  = 0.5;
      volBtn.innerHTML = SVG_VOL_ON;
      hasInteractedWithVolume = true;
    }

    if (player.paused) {
      player.play();
      // Start the hide timer immediately — don't wait for the async 'play' event.
      // On iOS the event can fire late, leaving the button visibly stuck.
      playBtn.innerHTML = SVG_PAUSE;
      clearTimeout(hideTimer);
      hideTimer = setTimeout(hideBtn, 2000);
    } else {
      player.pause();
    }
  });

  // 'play' event: icon already updated above for taps; this handles any
  // programmatic play() calls (e.g. the visibility observer resuming).
  player.addEventListener('play',  () => { playBtn.innerHTML = SVG_PAUSE; clearTimeout(hideTimer); hideTimer = setTimeout(hideBtn, 2000); });
  player.addEventListener('pause', () => { playBtn.innerHTML = SVG_PLAY;  clearTimeout(hideTimer); showBtn(); });
  player.addEventListener('ended', () => { playBtn.innerHTML = SVG_PLAY;  clearTimeout(hideTimer); showBtn(); });

  // ── SEEK BAR ─────────────────────────────────────────
  // Vidstack fires 'time-update' (kebab-case, not 'timeupdate')
  player.addEventListener('time-update', () => {
    if (!player.duration) return;
    progress.value = (player.currentTime / player.duration) * 100;
  });
  // Stop click bubbling from the seek bar reaching the play/pause handler
  progress.addEventListener('click', (e) => { e.stopPropagation(); });
  progress.addEventListener('input', () => {
    if (!player.duration) return;
    player.currentTime = (progress.value / 100) * player.duration;
  });

  // ── VOLUME SLIDER ────────────────────────────────────
  // Stop click bubbling so dragging the slider never triggers play/pause
  volBar.addEventListener('click', (e) => { e.stopPropagation(); });
  volBar.addEventListener('input', () => {
    hasInteractedWithVolume = true;
    const v = parseFloat(volBar.value);
    player.volume = v;
    player.muted  = (v === 0);
    if (v > 0) lastVolume = v;          // remember last audible level
    // Icon update is handled by the 'volume-change' listener below
  });

  // ── MUTE BUTTON ──────────────────────────────────────
  // Shared toggle logic — completely decoupled from play/pause.
  // Uses player.muted = !player.muted so Vidstack owns the state change
  // and fires 'volume-change', which drives the icon (single source of truth).
  const toggleMute = () => {
    hasInteractedWithVolume = true;
    player.muted = !player.muted;
    if (!player.muted) {
      // Unmute: restore last known audible level (never drops back to 0)
      player.volume = lastVolume;
      volBar.value  = lastVolume;
    } else {
      // Mute: remember current level before silencing
      if (player.volume > 0) lastVolume = player.volume;
      volBar.value = 0;
    }
    // Video continues playing — mute only affects audio, never playback state
  };

  // Authoritative icon sync — fires whenever Vidstack's volume/mute state
  // changes, including programmatic updates and slider input above.
  player.addEventListener('volume-change', () => {
    volBtn.innerHTML = (player.muted || player.volume === 0) ? SVG_VOL_OFF : SVG_VOL_ON;
  });

  // Touch: preventDefault suppresses the ghost click iOS fires ~300 ms later;
  // stopPropagation decouples from the play/pause controls handler above.
  // We also stamp lastTouchTime here because stopPropagation prevents the
  // controls touchend from reaching it — without this, the click guard below
  // never fires and toggleMute() would run twice on every mobile tap.
  volBtn.addEventListener('touchend', (e) => {
    e.stopPropagation();
    e.preventDefault();
    lastTouchTime = Date.now();
    toggleMute();
  });

  // Desktop click: stopPropagation decouples from play/pause;
  // 500 ms guard deduplicates against the touchend handler above.
  volBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (Date.now() - lastTouchTime < 500) return;
    e.preventDefault();
    toggleMute();
  });
});

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
