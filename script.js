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

// ── PORTFOLIO VIDEO PLAY BUTTON ──────────────────────
document.querySelectorAll('.phone-screen').forEach(screen => {
  const video = screen.querySelector('video');
  const btn = screen.querySelector('.play-btn');
  if (!video || !btn) return;

  const toggle = () => {
    if (video.paused) {
      video.play();
      btn.classList.add('hidden');
    } else {
      video.pause();
      btn.classList.remove('hidden');
    }
  };

  ['click', 'touchend'].forEach(evt => {
    btn.addEventListener(evt, (e) => { e.preventDefault(); toggle(); });
    video.addEventListener(evt, (e) => { e.preventDefault(); toggle(); });
  });

  video.addEventListener('ended', () => {
    btn.classList.remove('hidden');
  });
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
