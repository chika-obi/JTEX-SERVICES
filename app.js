// =========================
// Preloader (Hybrid logic)
// =========================
window.addEventListener("load", () => {
  const preloader = document.getElementById("preloader");
  const minTime = 2500; // minimum preloader time in ms
  const start = Date.now();

  function hidePreloader() {
    const elapsed = Date.now() - start;
    const delay = Math.max(0, minTime - elapsed);
    setTimeout(() => {
      preloader.style.opacity = "0";
      preloader.style.pointerEvents = "none";
      setTimeout(() => preloader.remove(), 600);
    }, delay);
  }

  if (document.readyState === "complete") hidePreloader();
  else window.addEventListener("load", hidePreloader);
});

// =========================
// Smooth Scroll Navigation
// =========================
const navLinks = document.querySelectorAll('a[href^="#"]');
navLinks.forEach(link => {
  link.addEventListener("click", e => {
    const target = document.querySelector(link.getAttribute("href"));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

// =========================
// Scroll Reveal Animation
// =========================
const reveals = document.querySelectorAll(".reveal");
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("show");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
reveals.forEach(el => observer.observe(el));

// =========================
// Contact Form Placeholder
// =========================
const form = document.getElementById("contactForm");
if (form) {
  form.addEventListener("submit", e => {
    e.preventDefault();
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();

    if (!name || !email) {
      alert("⚠️ Please fill in both your name and email.");
      return;
    }

    alert(`✅ Thank you, ${name}! Your request has been received. We'll get back to you shortly.`);
    form.reset();
  });
}

// =========================
// Parallax Hero Rig Motion
// =========================
const rig = document.querySelector(".rig");
if (rig) {
  rig.addEventListener("mousemove", e => {
    const rect = rig.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    rig.style.transform = `translate3d(${x * 8}px, ${y * 8}px, 0)`;
  });
  rig.addEventListener("mouseleave", () => {
    rig.style.transform = "none";
  });
}

// =========================
// Mobile Menu Toggle
// =========================
const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector("nav ul");

if (menuToggle && nav) {
  menuToggle.addEventListener("click", () => {
    nav.classList.toggle("open");
    menuToggle.classList.toggle("active");
  });
}

// Auto-close nav on link click (mobile)
navLinks.forEach(link => {
  link.addEventListener("click", () => {
    if (nav.classList.contains("open")) {
      nav.classList.remove("open");
      menuToggle.classList.remove("active");
    }
  });
});

// =========================
// Year Auto Update
// =========================
const year = document.getElementById("yr");
if (year) year.textContent = new Date().getFullYear();