// app.js — JTEX Services Limited
// Responsive features: touch slider, active nav scroll, mobile drawer, back-to-top, canvas waves, preloader

/* =========================
   Preloader Animation & Cleanup
   ========================= */
const PRELOADER_MIN_MS = 1200;
const preloaderStart = Date.now();
let preloaderDismissed = false;

function setupPrelogo() {
  const companyName = "JTEX SERVICES";
  const prelogo = document.querySelector(".prelogo");
  if (prelogo && prelogo.children.length === 0) {
    companyName.split("").forEach((letter, index) => {
      const span = document.createElement("span");
      span.textContent = letter === " " ? "\u00A0" : letter;
      span.style.animationDelay = `${index * 0.08}s`;
      prelogo.appendChild(span);
    });
  }
}

function hidePreloader() {
  if (preloaderDismissed) return;
  const preloader = document.getElementById('preloader');
  if (!preloader) {
    preloaderDismissed = true;
    return;
  }
  const elapsed = Date.now() - preloaderStart;
  const wait = Math.max(0, PRELOADER_MIN_MS - elapsed);
  setTimeout(() => {
    preloaderDismissed = true;
    if (preloader.style) {
      preloader.style.transition = 'opacity 0.5s ease';
      preloader.style.opacity = '0';
      preloader.style.pointerEvents = 'none';
    }
    setTimeout(() => {
      try {
        if (preloader.parentNode) {
          preloader.parentNode.removeChild(preloader);
        } else {
          preloader.style.display = 'none';
        }
      } catch (e) {
        /* ignore */
      }
    }, 550);
  }, wait);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupPrelogo);
} else {
  setupPrelogo();
}

window.addEventListener('load', hidePreloader);
setTimeout(hidePreloader, 3500);

/* =========================
   Smooth scroll & Active Link Tracker
   ========================= */
function initSmoothScrollAndNav() {
  const links = document.querySelectorAll('header nav a[href^="#"], header .brand[href^="#"], header .cta[href^="#"], .hero-cta a[href^="#"], .faq-contact-card a[href^="#"], footer a[href^="#"]');
  links.forEach(a => {
    a.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (!href || href === '#') return;
      try {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();

          if (href === '#home') {
            window.scrollTo({
              top: 0,
              behavior: 'smooth'
            });
            return;
          }

          const header = document.querySelector('header');
          const headerHeight = header ? header.offsetHeight : 76;
          const elementPosition = target.getBoundingClientRect().top;
          
          // Tight, clean offset so the section heading lands cleanly without excessive gap
          const offsetPosition = elementPosition + window.pageYOffset - (headerHeight + 6);

          window.scrollTo({
            top: Math.max(0, offsetPosition),
            behavior: 'smooth'
          });

          // Sync active class on nav
          const navLinks = document.querySelectorAll('header nav a');
          navLinks.forEach(link => {
            if (link.getAttribute('href') === href) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      } catch (err) {
        /* ignore */
      }
    });
  });

  // Track active section on scroll
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('header nav a');

  function highlightNav() {
    const scrollY = window.pageYOffset;
    const header = document.querySelector('header');
    const headerHeight = header ? header.offsetHeight : 76;

    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - headerHeight - 30;
      const sectionId = current.getAttribute('id');
      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        navLinks.forEach(link => {
          if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  }

  window.addEventListener('scroll', highlightNav, { passive: true });
}

/* =========================
   Reveal on scroll (IntersectionObserver)
   ========================= */
function initReveal() {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('show');
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    reveals.forEach(r => io.observe(r));
  } else {
    reveals.forEach(r => {
      r.classList.add('show');
      r.classList.add('active');
    });
  }
}

/* =========================
   Toast Notification System
   ========================= */
function showToast(title, message, iconClass = 'fa-solid fa-circle-check', duration = 5000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'alert');

  toast.innerHTML = `
    <div class="toast-icon">
      <i class="${iconClass}"></i>
    </div>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button type="button" class="toast-close" aria-label="Close notification">
      <i class="fa-solid fa-xmark"></i>
    </button>
    <div class="toast-progress"></div>
  `;

  container.appendChild(toast);

  // Trigger smooth entrance
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  const closeBtn = toast.querySelector('.toast-close');
  let dismissTimer;

  const dismissToast = () => {
    clearTimeout(dismissTimer);
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 450);
  };

  if (closeBtn) {
    closeBtn.addEventListener('click', dismissToast);
  }

  dismissTimer = setTimeout(dismissToast, duration);
}

/* =========================
   Contact Form & Interactive RFQ Portal Handler
   ========================= */
function initContactForm() {
  const form = document.getElementById('contactForm');
  const successCard = document.getElementById('formSuccessState');
  const submitBtn = document.getElementById('submitBtn');
  const newRequestBtn = document.getElementById('newRequestBtn');
  const waRfqBtn = document.getElementById('waRfqBtn');
  const messageEl = document.getElementById('message');
  const serviceEl = document.getElementById('service-type');
  const locationEl = document.getElementById('delivery-location');
  const intentInput = document.getElementById('rfq-intent');
  const urgencyInput = document.getElementById('rfq-urgency');
  const rfqTabs = document.querySelectorAll('.rfq-tab');
  const urgencyPills = document.querySelectorAll('.urgency-pill');
  const specTags = document.querySelectorAll('.spec-tag');

  if (!form || !successCard) return;

  // 1. RFQ Intent Mode Tabs (Commercial RFQ / 24/7 Rig Hot-Shot / Vendor Partnership)
  rfqTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      rfqTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const mode = tab.dataset.mode;
      const tabTitle = tab.querySelector('span') ? tab.querySelector('span').textContent.trim() : 'Commercial RFQ';
      if (intentInput) intentInput.value = tabTitle;

      if (mode === 'hotshot') {
        // Activate 24h urgency
        urgencyPills.forEach(p => {
          if (p.dataset.urgency.includes('24h')) {
            p.click();
          }
        });
        if (serviceEl) serviceEl.value = 'drilling-chemicals';
        if (messageEl && !messageEl.value.includes('EMERGENCY HOTSHOT')) {
          messageEl.placeholder = 'Describe urgent rig condition: Lost circulation, stuck pipe, kick control, or required mud weight increase (ppg) and ETA needed...';
        }
      } else if (mode === 'partnership') {
        if (serviceEl) serviceEl.value = 'procurement';
        if (messageEl) {
          messageEl.placeholder = 'Describe your vendor capabilities, product line, OEM representation, or joint venture proposal...';
        }
      } else {
        if (messageEl) {
          messageEl.placeholder = 'Provide details on quantities (metric tonnes/sacks/drums), mud density requirements, wellbore specifications, or equipment part numbers...';
        }
      }
      updateWhatsAppHref();
    });
  });

  // 2. Dispatch Urgency Pills
  urgencyPills.forEach(pill => {
    pill.addEventListener('click', () => {
      urgencyPills.forEach(p => {
        p.classList.remove('active');
        p.setAttribute('aria-checked', 'false');
      });
      pill.classList.add('active');
      pill.setAttribute('aria-checked', 'true');
      const urgencyVal = pill.dataset.urgency;
      if (urgencyInput) urgencyInput.value = urgencyVal;
      updateWhatsAppHref();
    });
  });

  // 3. Quick Requirement Spec Tags (Click to append into message)
  specTags.forEach(tag => {
    tag.addEventListener('click', (e) => {
      e.preventDefault();
      const insertText = tag.dataset.insert;
      if (!messageEl || !insertText) return;

      const currentVal = messageEl.value.trim();
      if (currentVal.includes(insertText)) {
        showToast('Spec Already Added', `"${insertText}" is already included in your requirements.`, 'fa-solid fa-circle-info', 2500);
        return;
      }

      if (currentVal.length > 0) {
        messageEl.value = `${currentVal}\n• Required: ${insertText}`;
      } else {
        messageEl.value = `• Required: ${insertText}`;
      }

      // Visual feedback on tag
      tag.style.transform = 'scale(0.95)';
      setTimeout(() => {
        tag.style.transform = '';
      }, 150);

      messageEl.focus();
      updateWhatsAppHref();
    });
  });

  // Helper to dynamically keep direct WhatsApp RFQ link in sync with user selections
  function updateWhatsAppHref() {
    if (!waRfqBtn) return;
    const name = document.getElementById('name')?.value.trim() || 'Client';
    const company = document.getElementById('company')?.value.trim() || '';
    const serviceName = serviceEl ? serviceEl.options[serviceEl.selectedIndex]?.text || 'Drilling Chemicals' : 'Drilling Chemicals';
    const location = locationEl ? locationEl.value : 'Port Harcourt';
    const urgency = urgencyInput ? urgencyInput.value : 'Standard Dispatch';

    let text = `Hello JTEX Services Commercial Desk, my name is ${name}${company ? ' from ' + company : ''}. I would like to request a quotation for: ${serviceName}. Delivery Target: ${location} (${urgency}).`;
    waRfqBtn.href = `https://wa.me/2348132764121?text=${encodeURIComponent(text)}`;
  }

  const inputFields = form.querySelectorAll('input, select, textarea');
  inputFields.forEach(input => {
    input.addEventListener('input', updateWhatsAppHref);
    input.addEventListener('change', updateWhatsAppHref);
  });

  // 4. Form Submission Handler
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const nameEl = document.getElementById('name');
    const emailEl = document.getElementById('email');
    const phoneEl = document.getElementById('phone');
    const companyEl = document.getElementById('company');

    const name = nameEl ? nameEl.value.trim() : '';
    const email = emailEl ? emailEl.value.trim() : '';
    const phone = phoneEl ? phoneEl.value.trim() : '';
    const company = companyEl ? companyEl.value.trim() : '';
    const serviceText = serviceEl ? serviceEl.options[serviceEl.selectedIndex]?.text : 'Drilling Chemicals, Fluids & Additives';
    const locationVal = locationEl ? locationEl.value : 'Port Harcourt Central Hub';
    const urgencyVal = urgencyInput ? urgencyInput.value : 'Standard Field Dispatch';

    if (!name || !email) {
      showToast('Validation Error', 'Please provide both your full name and corporate email address.', 'fa-solid fa-triangle-exclamation', 4000);
      return;
    }

    // Set loading state on submit button
    if (submitBtn) {
      submitBtn.disabled = true;
      const btnText = submitBtn.querySelector('.btn-text');
      const btnSpinner = submitBtn.querySelector('.btn-spinner');
      if (btnText) btnText.style.display = 'none';
      if (btnSpinner) btnSpinner.style.display = 'inline-flex';
    }

    // Simulate reliable dispatch to Port Harcourt engineering queue
    setTimeout(() => {
      // Generate reference ticket ID
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const refId = `JTX-RFQ-${new Date().getFullYear()}-${randomNum}`;

      // Update success card fields
      const clientNameEl = document.getElementById('successClientName');
      const refIdEl = document.getElementById('successRefId');
      const clientEmailEl = document.getElementById('successEmail');
      const successServiceEl = document.getElementById('successServiceScope');
      const successWaBtn = document.getElementById('successWaBtn');

      if (clientNameEl) clientNameEl.textContent = name;
      if (refIdEl) refIdEl.textContent = refId;
      if (clientEmailEl) clientEmailEl.textContent = email;
      if (successServiceEl) successServiceEl.textContent = serviceText;

      if (successWaBtn) {
        const waMsg = `Hello JTEX Commercial Desk, I just submitted RFQ #${refId} for ${serviceText} (${name}${company ? ', ' + company : ''}). Please confirm receipt.`;
        successWaBtn.href = `https://wa.me/2348132764121?text=${encodeURIComponent(waMsg)}`;
      }

      // Transition form out and show success state
      form.style.display = 'none';
      successCard.style.display = 'flex';

      // Reset submit button state for future requests
      if (submitBtn) {
        submitBtn.disabled = false;
        const btnText = submitBtn.querySelector('.btn-text');
        const btnSpinner = submitBtn.querySelector('.btn-spinner');
        if (btnText) btnText.style.display = 'inline-flex';
        if (btnSpinner) btnSpinner.style.display = 'none';
      }

      // Reset form values
      form.reset();

      // Trigger floating success toast
      showToast(
        'RFQ Transmitted Successfully',
        `Thank you ${name}! Ref #${refId} has been queued at our Port Harcourt engineering desk.`,
        'fa-solid fa-circle-check',
        6500
      );

      // Smooth scroll to success state if needed
      const container = document.getElementById('contactFormContainer');
      if (container) {
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 650);
  });

  // Handle "Submit Another RFQ" button
  if (newRequestBtn) {
    newRequestBtn.addEventListener('click', () => {
      successCard.style.display = 'none';
      form.style.display = 'block';
      const nameEl = document.getElementById('name');
      if (nameEl) nameEl.focus();
    });
  }

  // Update live working hours indicator
  function updateHqOperatingStatus() {
    const dot = document.querySelector('.hours-status-dot');
    if (!dot) return;
    try {
      const now = new Date();
      // WAT is UTC+1
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const watTime = new Date(utc + (3600000 * 1));
      const day = watTime.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
      const hour = watTime.getHours();

      let isOpen = false;
      if (day >= 1 && day <= 5) {
        // Mon-Fri: 8am - 5pm (17:00)
        isOpen = (hour >= 8 && hour < 17);
      } else if (day === 6) {
        // Sat: 9am - 1pm (13:00)
        isOpen = (hour >= 9 && hour < 13);
      }

      if (isOpen) {
        dot.style.background = '#22c55e';
        dot.style.boxShadow = '0 0 8px #22c55e';
      } else {
        // After hours / Sunday (24/7 on call)
        dot.style.background = '#f59e0b';
        dot.style.boxShadow = '0 0 8px #f59e0b';
      }
    } catch (e) {
      console.warn('Status update fallback:', e);
    }
  }

  updateHqOperatingStatus();
}

/* =========================
   Desktop Parallax Rig Effect
   ========================= */
function initRigParallax() {
  // Only enable on non-touch desktop devices
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const rig = document.querySelector('.rig');
    const mirror = document.querySelector('.rig-mirror');
    if (!rig) return;

    rig.addEventListener('mousemove', (e) => {
      const rect = rig.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      if (rig.style) {
        rig.style.transform = `translate3d(${x * 6}px, ${y * 4}px, 0)`;
      }
      if (mirror && mirror.style) {
        mirror.style.transform = `translate3d(${x * 4}px, ${Math.abs(y) * 4}px, 0) scale(1, 0.98)`;
      }
    });

    rig.addEventListener('mouseleave', () => {
      if (rig.style) rig.style.transform = 'none';
      if (mirror && mirror.style) mirror.style.transform = 'none';
    });
  }
}

/* =========================
   Mobile Menu Toggle with Backdrop Click
   ========================= */
function initMobileMenu() {
  const menuToggle = document.querySelector('.menu-toggle');
  const navList = document.querySelector('nav ul');
  if (!menuToggle || !navList) return;

  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    navList.classList.toggle('open');
    menuToggle.classList.toggle('active');
  });

  // Close when clicking nav item
  navList.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navList.classList.remove('open');
      menuToggle.classList.remove('active');
    });
  });

  // Close when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (!menuToggle.contains(e.target) && !navList.contains(e.target) && navList.classList.contains('open')) {
      navList.classList.remove('open');
      menuToggle.classList.remove('active');
    }
  });
}

/* =========================
   Canvas Wave Engine (Fluid & DPI-aware)
   ========================= */
function initWaveCanvas(canvasId, opts = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  let width = canvas.width;
  let height = canvas.height;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width || canvas.width || 300);
    height = Math.max(1, rect.height || canvas.height || 100);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    if (canvas.style) {
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
    }
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  const layers = opts.layers || [
    { amp: 14, freq: 0.008, speed: 0.3, color: 'rgba(0,179,179,0.12)' },
    { amp: 8, freq: 0.014, speed: 0.4, color: 'rgba(45,212,191,0.08)' }
  ];

  let t = 0;
  let rafId = null;

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    layers.forEach((L, idx) => {
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 10) {
        const y = height / 2 + Math.sin((x * L.freq) + (t * L.speed)) * L.amp * (1 + idx * 0.15);
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
    t += 0.8;
    rafId = requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });
  draw();

  return {
    stop() { if (rafId) cancelAnimationFrame(rafId); },
    resize
  };
}

/* =========================
   Project Gallery Slider with Touch Swipe
   ========================= */
function initGallerySlider() {
  const container = document.querySelector('.slider-container');
  const track = document.querySelector('.slider-track');
  if (!container || !track) return;
  const slides = Array.from(track.children);
  if (!slides.length) return;

  const nextButton = document.querySelector('.slider-container .next');
  const prevButton = document.querySelector('.slider-container .prev');
  let currentIndex = 0;
  let autoplayTimer = null;

  function updateSlider() {
    if (!slides[0] || !track.style) return;
    const slideWidth = slides[0].getBoundingClientRect().width;
    track.style.transform = `translateX(-${slideWidth * currentIndex}px)`;
  }

  function nextSlide() {
    currentIndex = (currentIndex + 1) % slides.length;
    updateSlider();
  }

  function prevSlide() {
    currentIndex = (currentIndex - 1 + slides.length) % slides.length;
    updateSlider();
  }

  if (nextButton) nextButton.addEventListener('click', nextSlide);
  if (prevButton) prevButton.addEventListener('click', prevSlide);

  function startAutoplay() {
    if (slides.length > 1) {
      stopAutoplay();
      autoplayTimer = setInterval(nextSlide, 5000);
    }
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  startAutoplay();
  container.addEventListener('mouseenter', stopAutoplay);
  container.addEventListener('mouseleave', startAutoplay);

  // Touch Swipe Support for Phone and Tablet
  let touchStartX = 0;
  let touchEndX = 0;

  container.addEventListener('touchstart', (e) => {
    stopAutoplay();
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
    startAutoplay();
  }, { passive: true });

  function handleSwipe() {
    const diff = touchStartX - touchEndX;
    const threshold = 40; // minimum swipe distance in px
    if (diff > threshold) {
      nextSlide();
    } else if (diff < -threshold) {
      prevSlide();
    }
  }

  window.addEventListener('resize', updateSlider, { passive: true });
}

/* =========================
   Back to Top Button
   ========================= */
function initBackToTop() {
  const backToTop = document.getElementById("backToTop");
  if (!backToTop) return;

  window.addEventListener("scroll", () => {
    if (window.scrollY > 350) {
      backToTop.classList.add("show");
    } else {
      backToTop.classList.remove("show");
    }
  }, { passive: true });

  backToTop.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });
}

/* =========================
   Global Site Search System
   ========================= */
const SEARCH_INDEX = [
  // Services
  {
    id: 'service-drilling-chemicals',
    category: 'service',
    badge: 'Service',
    icon: 'fa-solid fa-oil-well',
    title: 'Drilling Chemicals & Fluid Additives',
    description: 'High-performance water-based & synthetic fluids, cementing additives, completion fluids, viscosifiers, shale inhibitors, fluid loss control, and on-site technical mud support.',
    target: '#service-drilling-chemicals',
    keywords: ['mud', 'fluids', 'chemicals', 'drilling', 'viscosifier', 'shale', 'cementing', 'completion', 'hpht', 'additives', 'weighting', 'biocide', 'bentonite', 'barite']
  },
  {
    id: 'service-procurement',
    category: 'service',
    badge: 'Service',
    icon: 'fa-solid fa-flask',
    title: 'Strategic Industrial Procurement & Supply',
    description: 'End-to-end sourcing for industrial equipment, valves, pumps, OEM rig spares, instrumentation, and MRO consumables with verified manufacturer warranties.',
    target: '#service-procurement',
    keywords: ['procurement', 'supply', 'valves', 'pumps', 'mro', 'equipment', 'spares', 'oem', 'pipes', 'fittings', 'flanges', 'consumables', 'mechanical']
  },
  {
    id: 'service-environmental',
    category: 'service',
    badge: 'Service',
    icon: 'fa-solid fa-industry',
    title: 'Environmental Services & Waste Handling',
    description: 'Industrial site cleaning, pit cleaning, chemical waste disposal, bio-remediation, containment berms, and zero-discharge compliance auditing.',
    target: '#service-environmental',
    keywords: ['environmental', 'cleaning', 'waste', 'bio-remediation', 'hazardous', 'pit', 'containment', 'zero-discharge', 'remediation', 'nuprc', 'spill']
  },
  {
    id: 'service-logistics',
    category: 'service',
    badge: 'Service',
    icon: 'fa-solid fa-truck-fast',
    title: 'Chemical Logistics, Warehousing & Handling',
    description: 'Secure chemical warehousing, IBC tote & drum handling, regional inventory storage, and haulage across Port Harcourt, Warri, and Onne jetty heads.',
    target: '#service-logistics',
    keywords: ['logistics', 'handling', 'warehousing', 'ibc', 'totes', 'drums', 'transportation', 'storage', 'haulage', 'onne', 'warri', 'port harcourt', 'trucking']
  },
  {
    id: 'service-security',
    category: 'service',
    badge: 'Service',
    icon: 'fa-solid fa-fingerprint',
    title: 'Biometric Access Control & Facility Security',
    description: 'Supply, deployment, and integration of automated biometric access control, surveillance, and identity verification systems for sensitive oil & gas installations.',
    target: '#service-security',
    keywords: ['biometric', 'security', 'surveillance', 'access control', 'identity', 'cctv', 'facility', 'verification', 'cameras', 'turnstiles']
  },
  {
    id: 'service-contracts',
    category: 'service',
    badge: 'Service',
    icon: 'fa-solid fa-building-shield',
    title: 'General Contracts & Civil Materials',
    description: 'Civil works supplies, cement, scaffolding, structural steel, marine protective paints, and industrial building materials for energy infrastructure.',
    target: '#service-contracts',
    keywords: ['contracts', 'materials', 'civil', 'cement', 'steel', 'scaffolding', 'construction', 'infrastructure', 'paints', 'structural']
  },

  // FAQs
  {
    id: 'faq-lead-times',
    category: 'faq',
    badge: 'FAQ',
    icon: 'fa-solid fa-clock',
    title: 'Delivery & Procurement Lead Times (24-48 Hours)',
    description: 'In-stock drilling chemicals and standard supplies dispatch within 24 to 48 hours across Port Harcourt, Warri, and Onne. Custom formulations take 5 to 14 business days.',
    target: '#faq-lead-times',
    keywords: ['lead time', 'delivery', 'delivery time', 'speed', 'dispatch', 'port harcourt', 'warri', 'onne', 'hours', 'timeline', 'turnaround', 'how fast']
  },
  {
    id: 'faq-compliance',
    category: 'faq',
    badge: 'FAQ',
    icon: 'fa-solid fa-certificate',
    title: 'NUPRC & Nigerian Local Content (NCDMB) Compliance',
    description: 'JTEX Services Limited (RC: 1965120) complies with NUPRC environmental mandates, NOGIC/NCDMB Nigerian Local Content standards, and ISO QA/QC benchmarks.',
    target: '#faq-compliance',
    keywords: ['nuprc', 'ncdmb', 'local content', 'nogic', 'compliance', 'certification', 'rc', '1965120', 'dpr', 'iso', 'standards', 'accreditation']
  },
  {
    id: 'faq-coa-msds',
    category: 'faq',
    badge: 'FAQ',
    icon: 'fa-solid fa-file-lines',
    title: 'Certificates of Analysis (COA) and MSDS Sheets',
    description: 'Every chemical batch includes a verified Certificate of Analysis (COA), comprehensive Material Safety Data Sheet (MSDS/SDS), and lab test documentation.',
    target: '#faq-coa-msds',
    keywords: ['coa', 'msds', 'sds', 'certificate', 'analysis', 'safety data sheet', 'lab test', 'quality', 'specifications', 'batch', 'documentation']
  },
  {
    id: 'faq-hotshot-dispatch',
    category: 'faq',
    badge: 'FAQ',
    icon: 'fa-solid fa-life-ring',
    title: 'Emergency Rig Hot-Shot Dispatch (24/7)',
    description: '24/7 rapid response dispatch service for active drilling operations facing urgent fluid loss, mud weight adjustments, or immediate equipment requirements.',
    target: '#faq-hotshot-dispatch',
    keywords: ['emergency', 'hot-shot', 'hotshot', 'urgent', '24/7', 'rapid response', 'rig dispatch', 'fluid loss', 'breakdown', 'critical']
  },
  {
    id: 'faq-fluid-formulations',
    category: 'faq',
    badge: 'FAQ',
    icon: 'fa-solid fa-boxes-stacked',
    title: 'Bespoke Drilling Fluid Additives & Formulations',
    description: 'Custom formulation of viscosifiers, shale inhibitors, fluid loss control, and scale inhibitors designed for specific HPHT reservoir lithologies.',
    target: '#faq-fluid-formulations',
    keywords: ['custom', 'formulation', 'bespoke', 'blends', 'hpht', 'shale inhibitor', 'reservoir', 'lithology', 'mud engineer', 'specialty']
  },
  {
    id: 'faq-waste-handling',
    category: 'faq',
    badge: 'FAQ',
    icon: 'fa-solid fa-leaf',
    title: 'Hazardous Chemical Waste & Zero-Discharge Protocols',
    description: 'Zero-discharge standards, bio-neutralizers, containment berms, and certified safe haulage to authorized facilities with chain-of-custody documentation.',
    target: '#faq-waste-handling',
    keywords: ['waste', 'hazardous', 'zero-discharge', 'bio-neutralizer', 'containment', 'disposal', 'eco', 'environmental safety', 'cuttings']
  },

  // Leadership & Team
  {
    id: 'lead-md',
    category: 'leadership',
    badge: 'Leadership',
    icon: 'fa-solid fa-user-tie',
    title: 'Chimara Joe Jerry, MBA — Managing Director',
    description: 'Head of corporate strategy, executive leadership, petroleum logistics, and supply chain operations at JTEX Services Limited.',
    target: '#leadership',
    keywords: ['chimara', 'joe', 'jerry', 'managing director', 'md', 'ceo', 'leadership', 'executive', 'director', 'management']
  },
  {
    id: 'lead-gm',
    category: 'leadership',
    badge: 'Leadership',
    icon: 'fa-solid fa-user-gear',
    title: 'Ekweme Azeem Bestman, MSc, MNIM — General Manager',
    description: 'General Manager supervising technical operations, project management, and quality control execution across client sites.',
    target: '#leadership',
    keywords: ['ekweme', 'azeem', 'bestman', 'general manager', 'gm', 'project management', 'operations', 'quality control']
  },
  {
    id: 'lead-it',
    category: 'leadership',
    badge: 'Leadership',
    icon: 'fa-solid fa-laptop-code',
    title: 'Kpanuku Chika-Obi, MSc, MNCS — IT Consultant',
    description: 'IT and cybersecurity consultant overseeing digital infrastructure, biometric systems, enterprise data security, and automated workflows.',
    target: '#leadership',
    keywords: ['kpanuku', 'chika-obi', 'it consultant', 'cybersecurity', 'digital', 'technology', 'systems', 'infrastructure']
  },
  {
    id: 'lead-procurement',
    category: 'leadership',
    badge: 'Leadership',
    icon: 'fa-solid fa-boxes-packing',
    title: 'Chimara Joe Jackson, BSc, MBA — Procurement Manager',
    description: 'Procurement Manager coordinating vendor relationships, strategic sourcing, customs clearance, and expediting industrial materials.',
    target: '#leadership',
    keywords: ['chimara', 'jackson', 'procurement manager', 'purchasing', 'vendor', 'sourcing', 'supply manager']
  },

  // Contact & External
  {
    id: 'contact-rfq',
    category: 'contact',
    badge: 'RFQ Portal',
    icon: 'fa-solid fa-file-invoice-dollar',
    title: 'Commercial RFQ & 24/7 Rig Hot-Shot Portal',
    description: 'Submit technical chemical specifications, urgent wellbore mud requirements, delivery locations (Port Harcourt, Onne, Warri), or request rapid commercial proposals.',
    target: '#contact',
    keywords: ['quote', 'rfq', 'pricing', 'request', 'estimate', 'contact', 'proposal', 'inquiry', 'message', 'order', 'hotshot', 'hot-shot', 'urgency', 'barite', 'bentonite', 'commercial']
  },
  {
    id: 'contact-office',
    category: 'contact',
    badge: 'Contact',
    icon: 'fa-solid fa-location-dot',
    title: 'Port Harcourt Head Office & Hotlines',
    description: 'Mrs Ogechi Erhiakeme plaza, opposite A.A Rano filling Station, along Obiri Ikwerre New Airport Road, Port Harcourt, Rivers State, Nigeria. Phone: +234 (0) 806 326 3302.',
    target: '#contact',
    keywords: ['office', 'address', 'location', 'port harcourt', 'rivers state', 'phone', 'call', 'hotline', 'obiri ikwerre', 'airport road', 'ogechi erhiakeme', 'rano', 'email', 'jtexservices@gmail.com']
  },
  {
    id: 'contact-weather',
    category: 'contact',
    badge: 'Live Radar',
    icon: 'fa-solid fa-cloud-sun',
    title: 'Port Harcourt Real-Time Weather & Logistics Radar',
    description: 'Live field temperatures, humidity, wind velocity, and swamp/marine operational conditions in Port Harcourt for energy logistics, crane lifts, and haulage.',
    target: '#phWeatherCard',
    keywords: ['weather', 'climate', 'temperature', 'humidity', 'wind', 'port harcourt weather', 'rain', 'forecast', 'radar', 'logistics weather', 'marine conditions', 'onne', 'rig weather', 'swamp']
  },
  {
    id: 'portal-receipts',
    category: 'contact',
    badge: 'Portal',
    icon: 'fa-solid fa-receipt',
    title: 'Receipt & Billing Database Portal',
    description: 'External portal for accessing official verified transaction receipts, audit billing records, and payment tracking.',
    target: 'https://jtex-services-receipt-database.vercel.app/',
    isExternal: true,
    keywords: ['receipt', 'billing', 'database', 'invoice', 'payment', 'transaction', 'accounting', 'portal', 'verification', 'ledger']
  }
];

function initGlobalSearch() {
  const searchModal = document.getElementById('searchModal');
  const triggerBtn = document.getElementById('searchTriggerBtn');
  const closeBtn = document.getElementById('searchCloseBtn');
  const searchInput = document.getElementById('globalSearchInput');
  const clearBtn = document.getElementById('searchClearBtn');
  const resultsBody = document.getElementById('searchResultsBody');
  const resultCountEl = document.getElementById('searchResultCount');
  const filterPills = document.querySelectorAll('.search-filter-pill');

  if (!searchModal || !searchInput || !resultsBody) return;

  let currentCategory = 'all';
  let selectedIndex = -1;
  let currentResults = [];

  // Open modal
  function openSearch() {
    searchModal.classList.add('open');
    searchModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      searchInput.focus();
      searchInput.select();
    }, 50);
    renderResults();
  }

  // Close modal
  function closeSearch() {
    searchModal.classList.remove('open');
    searchModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    selectedIndex = -1;
  }

  // Clear query
  function clearSearch() {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    searchInput.focus();
    selectedIndex = -1;
    renderResults();
  }

  // Highlight matches helper
  function highlightText(text, query) {
    if (!query || !query.trim()) return text;
    const words = query.trim().split(/\s+/).filter(Boolean);
    const regex = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
  }

  // Perform search query
  function getSearchResults(query, category) {
    const cleanQuery = (query || '').toLowerCase().trim();
    let items = SEARCH_INDEX;

    if (category !== 'all') {
      items = items.filter(item => item.category === category);
    }

    if (!cleanQuery) {
      return items;
    }

    const queryTerms = cleanQuery.split(/\s+/).filter(Boolean);

    const scored = items.map(item => {
      let score = 0;
      const titleLower = item.title.toLowerCase();
      const descLower = item.description.toLowerCase();
      const keywords = item.keywords.map(k => k.toLowerCase());

      queryTerms.forEach(term => {
        if (titleLower.includes(term)) score += 10;
        if (descLower.includes(term)) score += 4;
        keywords.forEach(kw => {
          if (kw.includes(term)) score += 5;
          if (kw === term) score += 8;
        });
      });

      return { item, score };
    });

    return scored
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(entry => entry.item);
  }

  // Navigate to result
  function selectResult(resultItem) {
    if (!resultItem) return;

    if (resultItem.isExternal) {
      window.open(resultItem.target, '_blank', 'noopener,noreferrer');
      closeSearch();
      return;
    }

    closeSearch();

    const targetSelector = resultItem.target;
    if (!targetSelector) return;

    setTimeout(() => {
      const targetEl = document.querySelector(targetSelector);
      if (targetEl) {
        // If it is an FAQ item, expand it
        if (targetEl.classList.contains('faq-item')) {
          // Switch to all tab or corresponding tab
          const faqTabs = document.querySelectorAll('.faq-tab');
          const allTab = document.querySelector('.faq-tab[data-filter="all"]');
          if (allTab) {
            faqTabs.forEach(t => {
              t.classList.remove('active');
              t.setAttribute('aria-selected', 'false');
            });
            allTab.classList.add('active');
            allTab.setAttribute('aria-selected', 'true');
          }

          const allFaqItems = document.querySelectorAll('.faq-item');
          allFaqItems.forEach(fi => {
            fi.style.display = 'block';
            fi.classList.remove('active');
            const b = fi.querySelector('.faq-question');
            const a = fi.querySelector('.faq-answer');
            if (b) b.setAttribute('aria-expanded', 'false');
            if (a) a.style.maxHeight = null;
          });

          // Open targeted FAQ
          targetEl.classList.add('active');
          const btn = targetEl.querySelector('.faq-question');
          const ans = targetEl.querySelector('.faq-answer');
          if (btn) btn.setAttribute('aria-expanded', 'true');
          if (ans) ans.style.maxHeight = ans.scrollHeight + 'px';
        }

        // Scroll to element with header offset
        const headerOffset = 80;
        const elTop = targetEl.getBoundingClientRect().top;
        const offsetPosition = elTop + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });

        // Trigger highlight pulse
        targetEl.classList.remove('search-highlight-pulse');
        void targetEl.offsetWidth; // Trigger reflow
        targetEl.classList.add('search-highlight-pulse');

        setTimeout(() => {
          targetEl.classList.remove('search-highlight-pulse');
        }, 3000);
      }
    }, 200);
  }

  // Render search results
  function renderResults() {
    const query = searchInput.value;
    clearBtn.style.display = query ? 'block' : 'none';

    currentResults = getSearchResults(query, currentCategory);

    // If no query and user is browsing, show quick suggestions + top items
    if (!query.trim()) {
      let html = `
        <div class="search-suggestions-box">
          <div class="search-suggestions-title"><i class="fa-solid fa-bolt"></i> Popular Quick Searches</div>
          <div class="search-tags-grid">
            <button class="search-tag-chip" data-query="Drilling Chemicals"><i class="fa-solid fa-oil-well"></i> Drilling Chemicals</button>
            <button class="search-tag-chip" data-query="Lead Times"><i class="fa-solid fa-clock"></i> Lead Times (24-48h)</button>
            <button class="search-tag-chip" data-query="COA MSDS"><i class="fa-solid fa-file-lines"></i> COA &amp; MSDS</button>
            <button class="search-tag-chip" data-query="NUPRC Compliance"><i class="fa-solid fa-shield-check"></i> NUPRC Compliance</button>
            <button class="search-tag-chip" data-query="Emergency Hot-Shot"><i class="fa-solid fa-truck-fast"></i> Hot-Shot Rig Dispatch</button>
            <button class="search-tag-chip" data-query="Receipt Database"><i class="fa-solid fa-receipt"></i> Receipt Database</button>
          </div>
        </div>
      `;

      html += `<div style="font-size:11.5px;text-transform:uppercase;letter-spacing:0.8px;color:var(--muted);font-weight:600;padding:6px 12px 2px;">All Available Topics (${currentResults.length})</div>`;

      currentResults.forEach((item, index) => {
        html += `
          <div class="search-result-item ${index === selectedIndex ? 'selected' : ''}" data-index="${index}" role="button" tabindex="0">
            <div class="search-res-icon"><i class="${item.icon}"></i></div>
            <div class="search-res-content">
              <div class="search-res-header">
                <span class="search-res-badge">${item.badge}</span>
                <span class="search-res-title">${item.title}</span>
              </div>
              <div class="search-res-snippet">${item.description}</div>
            </div>
            <div class="search-res-arrow"><i class="fa-solid ${item.isExternal ? 'fa-arrow-up-right-from-square' : 'fa-chevron-right'}"></i></div>
          </div>
        `;
      });

      resultsBody.innerHTML = html;
      resultCountEl.textContent = `Showing all ${currentResults.length} indexed topics`;

      // Attach quick chips click listeners
      resultsBody.querySelectorAll('.search-tag-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const q = chip.getAttribute('data-query');
          searchInput.value = q;
          selectedIndex = 0;
          renderResults();
        });
      });

      attachResultItemListeners();
      return;
    }

    if (currentResults.length === 0) {
      resultsBody.innerHTML = `
        <div class="search-no-results">
          <i class="fa-solid fa-magnifying-glass-chart"></i>
          <h4>No matching topics found for "${escapeHtml(query)}"</h4>
          <p>Try searching for "drilling fluids", "lead times", "environmental", "NUPRC", or "receipt database".</p>
        </div>
      `;
      resultCountEl.textContent = `0 results found`;
      return;
    }

    let html = '';
    currentResults.forEach((item, index) => {
      html += `
        <div class="search-result-item ${index === selectedIndex ? 'selected' : ''}" data-index="${index}" role="button" tabindex="0">
          <div class="search-res-icon"><i class="${item.icon}"></i></div>
          <div class="search-res-content">
            <div class="search-res-header">
              <span class="search-res-badge">${item.badge}</span>
              <span class="search-res-title">${highlightText(item.title, query)}</span>
            </div>
            <div class="search-res-snippet">${highlightText(item.description, query)}</div>
          </div>
          <div class="search-res-arrow"><i class="fa-solid ${item.isExternal ? 'fa-arrow-up-right-from-square' : 'fa-chevron-right'}"></i></div>
        </div>
      `;
    });

    resultsBody.innerHTML = html;
    resultCountEl.textContent = `${currentResults.length} ${currentResults.length === 1 ? 'result' : 'results'} found`;
    attachResultItemListeners();
  }

  function attachResultItemListeners() {
    resultsBody.querySelectorAll('.search-result-item').forEach(itemEl => {
      itemEl.addEventListener('click', () => {
        const index = parseInt(itemEl.getAttribute('data-index'), 10);
        if (currentResults[index]) {
          selectResult(currentResults[index]);
        }
      });
      itemEl.addEventListener('mouseenter', () => {
        const index = parseInt(itemEl.getAttribute('data-index'), 10);
        selectedIndex = index;
        updateSelectedVisual();
      });
    });
  }

  function updateSelectedVisual() {
    const items = resultsBody.querySelectorAll('.search-result-item');
    items.forEach((el, i) => {
      if (i === selectedIndex) {
        el.classList.add('selected');
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        el.classList.remove('selected');
      }
    });
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m]);
  }

  // Event Listeners
  if (triggerBtn) {
    triggerBtn.addEventListener('click', openSearch);
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeSearch);
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', clearSearch);
  }

  // Close when clicking modal backdrop
  searchModal.addEventListener('click', (e) => {
    if (e.target === searchModal) {
      closeSearch();
    }
  });

  // Filter pills
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => {
        p.classList.remove('active');
        p.setAttribute('aria-selected', 'false');
      });
      pill.classList.add('active');
      pill.setAttribute('aria-selected', 'true');
      currentCategory = pill.getAttribute('data-category');
      selectedIndex = -1;
      renderResults();
    });
  });

  // Input typing
  searchInput.addEventListener('input', () => {
    selectedIndex = -1;
    renderResults();
  });

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    // Open on Ctrl+K, Cmd+K, or slash when not in an input
    const isModifierK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
    const isSlash = e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

    if (isModifierK || isSlash) {
      e.preventDefault();
      if (searchModal.classList.contains('open')) {
        closeSearch();
      } else {
        openSearch();
      }
      return;
    }

    if (!searchModal.classList.contains('open')) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeSearch();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentResults.length > 0) {
        selectedIndex = (selectedIndex + 1) % currentResults.length;
        updateSelectedVisual();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentResults.length > 0) {
        selectedIndex = (selectedIndex - 1 + currentResults.length) % currentResults.length;
        updateSelectedVisual();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && currentResults[selectedIndex]) {
        selectResult(currentResults[selectedIndex]);
      } else if (currentResults.length > 0) {
        selectResult(currentResults[0]);
      }
    }
  });
}

/* =========================
   FAQ Accordion & Category Filter
   ========================= */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  const faqTabs = document.querySelectorAll('.faq-tab');
  if (!faqItems.length) return;

  // Open first item by default
  if (faqItems[0]) {
    const firstBtn = faqItems[0].querySelector('.faq-question');
    const firstAns = faqItems[0].querySelector('.faq-answer');
    if (firstBtn && firstAns) {
      faqItems[0].classList.add('active');
      firstBtn.setAttribute('aria-expanded', 'true');
      firstAns.style.maxHeight = firstAns.scrollHeight + 'px';
    }
  }

  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    if (!questionBtn || !answer) return;

    questionBtn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close all other items in same accordion
      faqItems.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('active');
          const otherBtn = otherItem.querySelector('.faq-question');
          const otherAns = otherItem.querySelector('.faq-answer');
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
          if (otherAns) otherAns.style.maxHeight = null;
        }
      });

      // Toggle current item
      if (isActive) {
        item.classList.remove('active');
        questionBtn.setAttribute('aria-expanded', 'false');
        answer.style.maxHeight = null;
      } else {
        item.classList.add('active');
        questionBtn.setAttribute('aria-expanded', 'true');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  // Filter Tabs
  faqTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const filter = tab.getAttribute('data-filter');
      faqTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      faqItems.forEach(item => {
        const cat = item.getAttribute('data-category');
        if (filter === 'all' || cat === filter) {
          item.style.display = 'block';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });
}

/* ==========================================================================
   Port Harcourt Real-Time Operational Weather & Logistics Radar
   ========================================================================== */
function initPortHarcourtWeather() {
  const weatherCard = document.getElementById('phWeatherCard');
  if (!weatherCard) return;

  const tempEl = document.getElementById('weatherTemp');
  const tempUnitDisplay = document.getElementById('tempUnitDisplay');
  const feelsLikeEl = document.getElementById('weatherFeelsLike');
  const mainIconEl = document.getElementById('weatherMainIcon');
  const weatherDescEl = document.getElementById('weatherDesc');
  const localTimeEl = document.getElementById('weatherLocalTime');
  const humidityEl = document.getElementById('weatherHumidity');
  const humidityAdvisoryEl = document.getElementById('humidityAdvisory');
  const windEl = document.getElementById('weatherWind');
  const windAdvisoryEl = document.getElementById('windAdvisory');
  const precipEl = document.getElementById('weatherPrecip');
  const precipAdvisoryEl = document.getElementById('precipAdvisory');
  const pressureEl = document.getElementById('weatherPressure');
  const advisoryPill = document.getElementById('advisoryPill');
  const advisoryStatusText = document.getElementById('advisoryStatusText');
  const advisoryText = document.getElementById('advisoryText');
  const lastUpdatedEl = document.getElementById('weatherLastUpdated');
  const refreshBtn = document.getElementById('refreshWeatherBtn');
  const tempUnitToggle = document.getElementById('tempUnitToggle');

  // Footer indicators
  const footerWeatherSummary = document.getElementById('footerWeatherSummary');
  const footerWeatherWind = document.getElementById('footerWeatherWind');
  const footerWeatherIcon = document.getElementById('footerWeatherIcon');

  let isFahrenheit = false;
  let cachedWeatherData = null;

  // Degrees to Cardinal Direction Helper
  function degToCompass(num) {
    const val = Math.floor((num / 22.5) + 0.5);
    const arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    return arr[(val % 16)];
  }

  // WMO Weather Code Interpreter
  function parseWeatherCode(code, isDay = 1) {
    let icon = isDay ? 'fa-cloud-sun' : 'fa-cloud-moon';
    let desc = 'Partly Cloudy';
    let status = 'favorable';
    let advisory = 'Optimal weather conditions for chemical batch loading, hotshot road haulage, and Onne jetty marine transfers.';

    if (code === 0) {
      icon = isDay ? 'fa-sun' : 'fa-moon';
      desc = 'Clear Skies & Sunny';
      status = 'favorable';
      advisory = 'Clear skies across Port Harcourt. Prime conditions for swamp navigation, deck staging, and chemical dispatch.';
    } else if (code === 1 || code === 2) {
      icon = isDay ? 'fa-cloud-sun' : 'fa-cloud-moon';
      desc = 'Partly Cloudy & Humid';
      status = 'favorable';
      advisory = 'Standard Niger Delta conditions. Favorable for chemical batch loading and hotshot road haulage.';
    } else if (code === 3) {
      icon = 'fa-cloud';
      desc = 'Overcast Sky';
      status = 'favorable';
      advisory = 'Heavy cloud cover. Normal transport operations along Obiri Ikwerre New Airport corridor.';
    } else if (code === 45 || code === 48) {
      icon = 'fa-smog';
      desc = 'Harmattan Haze / Mist';
      status = 'caution';
      advisory = 'Reduced visibility. Exercise caution during swamp vessel movements and early morning logistics transfers.';
    } else if (code >= 51 && code <= 57) {
      icon = 'fa-cloud-rain';
      desc = 'Light Tropical Drizzle';
      status = 'favorable';
      advisory = 'Minor precipitation. Ensure standard waterproof tarping on open-bed flatbed chemical deliveries.';
    } else if (code >= 61 && code <= 67) {
      icon = 'fa-cloud-showers-heavy';
      desc = 'Moderate to Heavy Rain';
      status = 'caution';
      advisory = 'Active rainfall. Wet deck precautions in effect. Road transit times to Onne/Warri may experience minor delays.';
    } else if (code >= 80 && code <= 82) {
      icon = 'fa-cloud-showers-water';
      desc = 'Tropical Rain Showers';
      status = 'caution';
      advisory = 'Passing tropical downpours. Monitor heavy crane operations at terminal loadouts.';
    } else if (code >= 95) {
      icon = 'fa-bolt';
      desc = 'Thunderstorm & Squalls';
      status = 'alert';
      advisory = 'Squall line alert. Temporary suspension of offshore crane lifting and fuel transfer recommended until cells pass.';
    }

    return { icon, desc, status, advisory };
  }

  // Update West Africa Time Live Clock (Port Harcourt: UTC+1)
  function updateLiveClock() {
    if (!localTimeEl) return;
    try {
      const now = new Date();
      const options = {
        timeZone: 'Africa/Lagos',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      };
      const timeStr = new Intl.DateTimeFormat('en-GB', options).format(now);
      const timeSpan = localTimeEl.querySelector('span');
      if (timeSpan) {
        timeSpan.textContent = `${timeStr} WAT`;
      }
    } catch (e) {
      const d = new Date();
      const timeSpan = localTimeEl.querySelector('span');
      if (timeSpan) {
        timeSpan.textContent = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} WAT`;
      }
    }
  }

  setInterval(updateLiveClock, 1000);
  updateLiveClock();

  // Render Data to UI
  function renderWeather(data) {
    if (!data) return;
    cachedWeatherData = data;

    const tempC = Math.round(data.temperature_2m);
    const feelsC = Math.round(data.apparent_temperature);
    const tempF = Math.round((data.temperature_2m * 9/5) + 32);
    const feelsF = Math.round((data.apparent_temperature * 9/5) + 32);

    const displayTemp = isFahrenheit ? tempF : tempC;
    const displayFeels = isFahrenheit ? `${feelsF}°F` : `${feelsC}°C`;
    const displayUnit = isFahrenheit ? '°F' : '°C';

    if (tempEl) tempEl.textContent = displayTemp;
    if (tempUnitDisplay) tempUnitDisplay.textContent = displayUnit;
    if (feelsLikeEl) feelsLikeEl.textContent = displayFeels;

    const codeInfo = parseWeatherCode(data.weather_code, data.is_day);

    if (weatherDescEl) weatherDescEl.textContent = codeInfo.desc;
    if (mainIconEl) {
      mainIconEl.className = `fa-solid ${codeInfo.icon} weather-main-icon`;
    }

    // Humidity
    const humidity = data.relative_humidity_2m;
    if (humidityEl) humidityEl.textContent = `${humidity}%`;
    if (humidityAdvisoryEl) {
      if (humidity > 85) {
        humidityAdvisoryEl.textContent = 'High Moisture (Dry Storage Guard)';
      } else if (humidity < 60) {
        humidityAdvisoryEl.textContent = 'Dry Air Mass';
      } else {
        humidityAdvisoryEl.textContent = 'Tropical Humidity (Normal)';
      }
    }

    // Wind
    const windSpeed = Math.round(data.wind_speed_10m);
    const windDir = degToCompass(data.wind_direction_10m || 220);
    if (windEl) windEl.textContent = `${windSpeed} km/h ${windDir}`;
    if (windAdvisoryEl) {
      if (windSpeed > 35) {
        windAdvisoryEl.textContent = 'High Wind Warning (Crane Caution)';
      } else if (windSpeed > 22) {
        windAdvisoryEl.textContent = 'Moderate Rig Gusts';
      } else {
        windAdvisoryEl.textContent = 'Safe for Crane Lifts & Marine';
      }
    }

    // Precipitation
    const precip = data.precipitation || 0;
    if (precipEl) precipEl.textContent = `${precip.toFixed(1)} mm/h`;
    if (precipAdvisoryEl) {
      if (precip > 5) {
        precipAdvisoryEl.textContent = 'Heavy Rain / Wet Deck';
      } else if (precip > 0.1) {
        precipAdvisoryEl.textContent = 'Light Surface Moisture';
      } else {
        precipAdvisoryEl.textContent = 'Dry Deck & Roads';
      }
    }

    // Pressure
    const pressure = Math.round(data.surface_pressure || 1012);
    if (pressureEl) pressureEl.textContent = `${pressure} hPa`;

    // Advisory Pill & Text
    if (advisoryPill && advisoryStatusText && advisoryText) {
      advisoryPill.className = `advisory-status-pill ${codeInfo.status}`;
      if (codeInfo.status === 'favorable') {
        advisoryPill.innerHTML = '<i class="fa-solid fa-circle-check"></i> <span id="advisoryStatusText">Operations Favorable</span>';
      } else if (codeInfo.status === 'caution') {
        advisoryPill.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <span id="advisoryStatusText">Operations Advisory</span>';
      } else {
        advisoryPill.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> <span id="advisoryStatusText">Severe Weather Alert</span>';
      }
      advisoryText.textContent = codeInfo.advisory;
    }

    // Footer ticker
    if (footerWeatherSummary) {
      footerWeatherSummary.textContent = `${displayTemp}${displayUnit} ${codeInfo.desc}`;
    }
    if (footerWeatherWind) {
      footerWeatherWind.textContent = `${windSpeed} km/h ${windDir}`;
    }
    if (footerWeatherIcon) {
      footerWeatherIcon.className = `fa-solid ${codeInfo.icon}`;
    }

    if (lastUpdatedEl) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      lastUpdatedEl.textContent = `at ${timeStr}`;
    }
  }

  // Fetch Live Weather from Open-Meteo
  async function fetchPortHarcourtWeather(forceRefresh = false) {
    if (refreshBtn) refreshBtn.classList.add('spinning');

    const lat = 4.8156;
    const lon = 7.0498;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=Africa%2FLagos`;

    try {
      const response = await fetch(url, { cache: forceRefresh ? 'no-cache' : 'default' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();

      if (json && json.current) {
        renderWeather(json.current);
      } else {
        throw new Error('Malformed payload');
      }
    } catch (err) {
      console.warn('Live weather feed fallback:', err);
      if (!cachedWeatherData) {
        renderWeather({
          temperature_2m: 29.4,
          apparent_temperature: 33.8,
          relative_humidity_2m: 78,
          is_day: 1,
          precipitation: 0.0,
          weather_code: 2,
          wind_speed_10m: 12.6,
          wind_direction_10m: 225,
          surface_pressure: 1012.3
        });
      }
    } finally {
      setTimeout(() => {
        if (refreshBtn) refreshBtn.classList.remove('spinning');
      }, 500);
    }
  }

  // Event Listeners
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      fetchPortHarcourtWeather(true);
    });
  }

  if (tempUnitToggle) {
    tempUnitToggle.addEventListener('click', () => {
      isFahrenheit = !isFahrenheit;
      tempUnitToggle.textContent = isFahrenheit ? '°F' : '°C';
      if (cachedWeatherData) {
        renderWeather(cachedWeatherData);
      }
    });
  }

  // Initial fetch and 15-minute background refresh
  fetchPortHarcourtWeather();
  setInterval(() => {
    fetchPortHarcourtWeather(false);
  }, 15 * 60 * 1000);
}

/* ==========================================================================
   Hero Section Cinematic Video-Like Dynamic Backdrop
   Drilling Fluid Dynamics, Viscosity Particles, Sonar Radar & Energy Currents
   ========================================================================== */
function initHeroCinematicCanvas() {
  const canvas = document.getElementById('heroCinematicCanvas');
  const heroSection = document.getElementById('home');
  if (!canvas || !heroSection) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let animationFrameId = null;
  let isVisible = true;
  const mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000, active: false };
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Particle System (Hydrocarbon Molecules, Barite & Drilling Fluid Suspensions)
  const PARTICLE_COUNT = 48;
  const particles = [];

  function resizeCanvas() {
    const rect = heroSection.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function createParticles() {
    particles.length = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * (width || 1200),
        y: Math.random() * (height || 600),
        vx: (Math.random() - 0.5) * 0.35,
        vy: -0.15 - Math.random() * 0.35, // Gentle buoyant float upward
        radius: 1.2 + Math.random() * 2.2,
        alpha: 0.18 + Math.random() * 0.45,
        pulseSpeed: 0.015 + Math.random() * 0.02,
        pulseAngle: Math.random() * Math.PI * 2,
        // Brand Palette: Emerald Teal (#2dd4bf), Hydrocarbon Cyan (#38bdf8), Energy Amber (#f59e0b)
        color: i % 6 === 0 
          ? 'rgba(245, 158, 11, ' // Amber energy
          : i % 2 === 0 
            ? 'rgba(45, 212, 191, ' // Emerald teal
            : 'rgba(56, 189, 248, ' // Hydrocarbon cyan
      });
    }
  }

  // Sonar Rings (Offshore Wellbore & Rig Telemetry Radar)
  const sonarRings = [
    { x: 0.78, y: 0.48, radius: 15, maxRadius: 260, speed: 0.55, alpha: 0.25 },
    { x: 0.78, y: 0.48, radius: 130, maxRadius: 260, speed: 0.55, alpha: 0.12 }
  ];

  // Mouse interaction
  heroSection.addEventListener('mousemove', (e) => {
    const rect = heroSection.getBoundingClientRect();
    mouse.targetX = e.clientX - rect.left;
    mouse.targetY = e.clientY - rect.top;
    mouse.active = true;
  }, { passive: true });

  heroSection.addEventListener('mouseleave', () => {
    mouse.active = false;
    mouse.targetX = -1000;
    mouse.targetY = -1000;
  });

  function drawFluidWaves(time) {
    // Wave 1: Deep Petroleum Cyan Fluid Flow
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 12) {
      const y = height * 0.70 +
        Math.sin(x * 0.0035 + time * 0.0007) * 28 +
        Math.cos(x * 0.007 + time * 0.0011) * 16;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    const grad1 = ctx.createLinearGradient(0, height * 0.5, width, height);
    grad1.addColorStop(0, 'rgba(13, 148, 136, 0.13)');
    grad1.addColorStop(0.5, 'rgba(14, 165, 233, 0.09)');
    grad1.addColorStop(1, 'rgba(15, 23, 42, 0.28)');
    ctx.fillStyle = grad1;
    ctx.fill();
    ctx.restore();

    // Wave 2: Upper Shimmer Stream
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 10) {
      const y = height * 0.78 +
        Math.sin(x * 0.0048 - time * 0.0009) * 22 +
        Math.sin(x * 0.0095 + time * 0.0014) * 10;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    const grad2 = ctx.createLinearGradient(width, height * 0.6, 0, height);
    grad2.addColorStop(0, 'rgba(45, 212, 191, 0.09)');
    grad2.addColorStop(1, 'rgba(2, 132, 199, 0.03)');
    ctx.fillStyle = grad2;
    ctx.fill();
    ctx.restore();

    // Wave 3: Subtle Glowing Subsea Wireframe Crest Line
    ctx.save();
    ctx.beginPath();
    for (let x = 0; x <= width; x += 15) {
      const y = height * 0.65 +
        Math.sin(x * 0.0029 + time * 0.0005) * 34 +
        Math.cos(x * 0.0058 - time * 0.0008) * 14;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.16)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  function drawSonarTelemetry() {
    const originX = width * 0.78;
    const originY = height * 0.48;

    sonarRings.forEach(ring => {
      ring.radius += ring.speed;
      if (ring.radius > ring.maxRadius) {
        ring.radius = 10;
      }
      const progress = ring.radius / ring.maxRadius;
      const currentAlpha = ring.alpha * (1 - progress);

      ctx.save();
      ctx.beginPath();
      ctx.arc(originX, originY, ring.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(56, 189, 248, ${currentAlpha})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawParticlesAndBonds() {
    mouse.x += (mouse.targetX - mouse.x) * 0.08;
    mouse.y += (mouse.targetY - mouse.y) * 0.08;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      p.x += p.vx;
      p.y += p.vy;
      p.pulseAngle += p.pulseSpeed;

      if (p.x < -20) p.x = width + 20;
      if (p.x > width + 20) p.x = -20;
      if (p.y < -20) p.y = height + 20;
      if (p.y > height + 20) p.y = -20;

      // Mouse repulsion
      if (mouse.active) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120 && dist > 0) {
          const force = (120 - dist) / 120 * 0.7;
          p.x += (dx / dist) * force;
          p.y += (dy / dist) * force;
        }
      }

      const pulseAlpha = Math.max(0.08, p.alpha * (0.7 + 0.3 * Math.sin(p.pulseAngle)));

      // Draw particle
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `${p.color}${pulseAlpha})`;
      ctx.shadowColor = `${p.color}0.5)`;
      ctx.shadowBlur = 5;
      ctx.fill();
      ctx.restore();

      // Connect nearby particles (Polymer chains)
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 85) {
          const lineAlpha = (1 - dist / 85) * 0.12 * pulseAlpha;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(45, 212, 191, ${lineAlpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  function render(timestamp) {
    if (!isVisible) return;

    ctx.clearRect(0, 0, width, height);

    drawFluidWaves(timestamp || 0);
    drawSonarTelemetry();
    drawParticlesAndBonds();

    if (!prefersReducedMotion) {
      animationFrameId = requestAnimationFrame(render);
    }
  }

  // Viewport intersection observer to conserve CPU/battery when scrolled away
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        isVisible = entry.isIntersecting;
        if (isVisible && !animationFrameId && !prefersReducedMotion) {
          animationFrameId = requestAnimationFrame(render);
        } else if (!isVisible && animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      });
    }, { threshold: 0.05 });
    observer.observe(heroSection);
  }

  window.addEventListener('resize', () => {
    resizeCanvas();
    if (prefersReducedMotion) {
      render(0);
    }
  }, { passive: true });

  resizeCanvas();
  createParticles();
  render(0);
}

/* ==========================================================================
   Secondary Footer Wave Canvas Helper
   ========================================================================== */
function initWaveCanvas(canvasId, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const layers = options.layers || [
    { amp: 10, freq: 0.015, speed: 0.22, color: 'rgba(0,179,179,0.10)' }
  ];

  let width = (canvas.width = canvas.offsetWidth || 300);
  let height = (canvas.height = canvas.offsetHeight || 60);
  let time = 0;

  function resize() {
    width = canvas.width = canvas.offsetWidth || 300;
    height = canvas.height = canvas.offsetHeight || 60;
  }
  window.addEventListener('resize', resize, { passive: true });

  function renderWave() {
    ctx.clearRect(0, 0, width, height);
    layers.forEach(layer => {
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 10) {
        const y = height / 2 + Math.sin(x * layer.freq + time * layer.speed) * layer.amp;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = layer.color;
      ctx.fill();
    });
    time += 0.04;
    requestAnimationFrame(renderWave);
  }
  renderWave();
}

/* =========================
   App Initialization
   ========================= */
function initApp() {
  initSmoothScrollAndNav();
  initReveal();
  initContactForm();
  initMobileMenu();
  initRigParallax();
  initGallerySlider();
  initFaqAccordion();
  initGlobalSearch();
  initBackToTop();
  initPortHarcourtWeather();
  initHeroCinematicCanvas();

  // Footer wave
  try {
    initWaveCanvas('footerWave', {
      layers: [
        { amp: 10, freq: 0.015, speed: 0.22, color: 'rgba(0,179,179,0.10)' },
        { amp: 5, freq: 0.024, speed: 0.16, color: 'rgba(45,212,191,0.05)' }
      ]
    });
  } catch (e) { /* ignore */ }

  // Set current year in footer
  const yearEl = document.getElementById('yr');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
