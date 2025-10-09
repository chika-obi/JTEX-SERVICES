// app.js — JTEX Services
// Handles: preloader (hybrid), smooth scroll, reveal on scroll, contact form, parallax rig + mirror,
// mobile menu, and canvas wave engine (hero + footer).

/* =========================
   Preloader — Hybrid logic
   Shows until window load AND minimum time elapsed
   ========================= */
const PRELOADER_MIN_MS = 2500;
const preloaderStart = Date.now();

function hidePreloader(preloader) {
  if (!preloader) return;
  const elapsed = Date.now() - preloaderStart;
  const wait = Math.max(0, PRELOADER_MIN_MS - elapsed);
  setTimeout(() => {
    preloader.style.transition = 'opacity 0.6s ease';
    preloader.style.opacity = '0';
    preloader.style.pointerEvents = 'none';
    setTimeout(() => {
      try { preloader.remove(); } catch (e) { /* ignore */ }
    }, 700);
  }, wait);
}

window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');
  hidePreloader(preloader);
});

/* =========================
   Smooth scroll for internal links
   ========================= */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

/* =========================
   Reveal on scroll (IntersectionObserver)
   ========================= */
function initReveal() {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;
  const io = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  reveals.forEach(r => io.observe(r));
}

/* =========================
   Contact form (client-side placeholder)
   ========================= */
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const name = (document.getElementById('name') || {}).value || '';
    const email = (document.getElementById('email') || {}).value || '';
    if (!name.trim() || !email.trim()) {
      alert('⚠️ Please provide your name and email.');
      return;
    }
    // Placeholder behaviour — integrate with backend later.
    alert('✅ Thanks ' + name.trim() + '! Your request has been received.');
    form.reset();
  });
}

/* =========================
   Parallax rig + mirror sync
   ========================= */
function initRigParallax() {
  const rig = document.querySelector('.rig');
  const mirror = document.querySelector('.rig-mirror');
  if (!rig) return;

  rig.addEventListener('mousemove', (e) => {
    const rect = rig.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    // Gentle transform for rig itself (if present) — main rig transform may be set by CSS
    rig.style.transform = `translate3d(${x * 8}px, ${y * 6}px, 0)`;
    // Mirror gets a softer, inverted transform
    if (mirror) mirror.style.transform = `translate3d(${x * 6}px, ${Math.abs(y) * 6}px, 0) scale(1, 0.98)`;
  });
  rig.addEventListener('mouseleave', () => {
    rig.style.transform = 'none';
    if (mirror) mirror.style.transform = 'none';
  });
}

/* =========================
   Mobile menu toggle
   ========================= */
function initMobileMenu() {
  const menuToggle = document.querySelector('.menu-toggle');
  const navList = document.querySelector('nav ul');
  if (!menuToggle || !navList) return;
  menuToggle.addEventListener('click', () => {
    navList.classList.toggle('open');
    menuToggle.classList.toggle('active');
  });
  // auto-close on link click
  navList.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    if (navList.classList.contains('open')) {
      navList.classList.remove('open');
      menuToggle.classList.remove('active');
    }
  }));
}

/* =========================
   Canvas Wave Engine (retina-aware)
   - initWaveCanvas(canvasId, options)
   ========================= */
function initWaveCanvas(canvasId, opts = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  let width = canvas.width;
  let height = canvas.height;
  const dpr = window.devicePixelRatio || 1;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const layers = opts.layers || [
    { amp: 18, freq: 0.0085, speed: 0.35, color: 'rgba(0,179,179,0.12)' },
    { amp: 10, freq: 0.013, speed: 0.42, color: 'rgba(45,212,191,0.08)' },
    { amp: 6, freq: 0.02, speed: 0.25, color: 'rgba(255,255,255,0.02)' }
  ];

  let t = 0;
  let rafId = null;

  function draw() {
    ctx.clearRect(0, 0, width, height);
    layers.forEach((L, idx) => {
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 8) {
        const y = height / 2 + Math.sin((x * L.freq) + (t * L.speed)) * L.amp * (1 + idx * 0.18);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, L.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fill();
    });
    t += 0.9;
    rafId = requestAnimationFrame(draw);
  }

  // initialize
  resize();
  window.addEventListener('resize', () => {
    // reset transform then resize for crisp drawing
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    resize();
  });
  draw();

  return {
    stop() { if (rafId) cancelAnimationFrame(rafId); },
    resize
  };
}

/* =========================
   Init everything on DOMContentLoaded
   ========================= */
document.addEventListener('DOMContentLoaded', () => {
  // smooth scroll links
  initSmoothScroll();
  // reveal on scroll
  initReveal();
  // contact form
  initContactForm();
  // mobile menu
  initMobileMenu();
  // rig parallax + mirror
  initRigParallax();

  // Initialize canvas waves (safe-guarded)
  try {
    initWaveCanvas('heroWave', { layers: [
      { amp: 20, freq: 0.0075, speed: 0.3, color: 'rgba(0,179,179,0.10)' },
      { amp: 10, freq: 0.012, speed: 0.43, color: 'rgba(45,212,191,0.06)' }
    ] });
  } catch (e) { /* ignore canvas failure */ }

  try {
    initWaveCanvas('footerWave', { layers: [
      { amp: 12, freq: 0.015, speed: 0.24, color: 'rgba(0,179,179,0.09)' },
      { amp: 6, freq: 0.024, speed: 0.18, color: 'rgba(45,212,191,0.05)' }
    ] });
  } catch (e) { /* ignore canvas failure */ }

  // footer year
  const yearEl = document.getElementById('yr');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});

/* =========================
   Defensive: Ensure preloader removed if script loaded after 'load'
   ========================= */
if (document.readyState === 'complete') {
  const preloader = document.getElementById('preloader');
  if (preloader) hidePreloader(preloader);
}

// Your full company name
const companyName = "JTEX-SERVICES";

// Get the prelogo container
const prelogo = document.querySelector(".prelogo");

// Add each letter as a span
companyName.split("").forEach((letter, index) => {
  const span = document.createElement("span");
  span.textContent = letter;
  span.style.animationDelay = `${index * 0.5}s`; // stagger each letter
  prelogo.appendChild(span);
});

// Optional: hide preloader after page loads
window.addEventListener("load", () => {
  setTimeout(() => {
    document.getElementById("preloader").style.display = "none";
  }, 2000); // wait 2s for animation to finish
});

const images = document.querySelectorAll('.intro-image img');
let current = 0;

function fancySlide() {
  const next = (current + 1) % images.length;

  // Fade out current image
  images[current].classList.remove('active');

  // Fade in next image with zoom effect
  images[next].classList.add('active');

  current = next;
}

// Change image every 4 seconds
setInterval(fancySlide, 4000);


/* End of app.js */
