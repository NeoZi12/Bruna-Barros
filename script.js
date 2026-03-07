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

  playBtn.innerHTML = SVG_PLAY;

  // Auto-hide controls on touch after 2s (only while playing)
  const isTouch = window.matchMedia('(hover: none)').matches;
  let hideTimer = null;

  const showBtn = () => {
    playBtn.classList.remove('btn-hidden');
    clearTimeout(hideTimer);
  };

  const scheduleHide = () => {
    clearTimeout(hideTimer);
    if (!video.paused) {
      hideTimer = setTimeout(() => playBtn.classList.add('btn-hidden'), 2000);
    }
  };

  if (isTouch) {
    controls.addEventListener('touchstart', () => {
      showBtn();
      scheduleHide();
    }, { passive: true });
  }

  // Play / pause — clicking anywhere on the phone (controls overlay) toggles
  const togglePlay = (e) => {
    // Don't fire if clicking the seek bar or volume controls
    if (e.target === progress || e.target === volBar || e.target === volBtn) return;
    e.preventDefault();
    if (video.paused) { video.play(); } else { video.pause(); }
  };
  ['click', 'touchend'].forEach(evt => {
    controls.addEventListener(evt, togglePlay);
  });

  video.addEventListener('play',  () => { playBtn.innerHTML = SVG_PAUSE; if (isTouch) scheduleHide(); });
  video.addEventListener('pause', () => { playBtn.innerHTML = SVG_PLAY;  if (isTouch) showBtn(); });
  video.addEventListener('ended', () => { playBtn.innerHTML = SVG_PLAY;  if (isTouch) showBtn(); });

  // Seek bar
  video.addEventListener('timeupdate', () => {
    if (!video.duration) return;
    progress.value = (video.currentTime / video.duration) * 100;
  });
  progress.addEventListener('input', () => {
    if (!video.duration) return;
    video.currentTime = (progress.value / 100) * video.duration;
  });

  const SVG_VOL_ON  = `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
  const SVG_VOL_OFF = `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;

  // Volume
  volBar.addEventListener('input', () => {
    video.volume = volBar.value;
    video.muted = (volBar.value == 0);
    volBtn.innerHTML = (video.muted || video.volume === 0) ? SVG_VOL_OFF : SVG_VOL_ON;
  });

  const toggleMute = (e) => {
    e.preventDefault();
    video.muted = !video.muted;
    volBtn.innerHTML = video.muted ? SVG_VOL_OFF : SVG_VOL_ON;
    if (!video.muted) volBar.value = video.volume;
  };
  ['click', 'touchend'].forEach(evt => volBtn.addEventListener(evt, toggleMute));
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
