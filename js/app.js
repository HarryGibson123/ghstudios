/* ============================================================
   GH Studios — app.js
   Vanilla JS only. No frameworks, no libraries.
   ============================================================ */

'use strict';

/* ── Environment flags ── */
const IS_MOBILE = ('ontouchstart' in window) || window.matchMedia('(hover: none)').matches;
const REDUCED   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ================================================================
   1. SMOOTH SCROLL
   ================================================================ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    closeMobileNav();
  });
});

/* ================================================================
   2. NAVIGATION — scroll glass + active link
   ================================================================ */
const navEl      = document.getElementById('nav');
const hamburger  = document.getElementById('hamburger');
const navLinksEl = document.getElementById('nav-links');
const navLinks   = document.querySelectorAll('.nav-link');
const sections   = ['products', 'about', 'contact'];

function closeMobileNav() {
  hamburger.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
  navLinksEl.classList.remove('open');
}

hamburger.addEventListener('click', () => {
  const open = hamburger.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', String(open));
  navLinksEl.classList.toggle('open', open);
});

document.addEventListener('click', e => { if (!navEl.contains(e.target)) closeMobileNav(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMobileNav(); });

function updateNav() {
  navEl.classList.toggle('scrolled', window.scrollY > 20);
  let current = '';
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && window.scrollY >= el.offsetTop - 140) current = id;
  });
  navLinks.forEach(link =>
    link.classList.toggle('active', link.getAttribute('href') === `#${current}`)
  );
}
window.addEventListener('scroll', updateNav, { passive: true });
updateNav();

/* ================================================================
   3. SCROLL REVEAL — IntersectionObserver for sections below hero
   ================================================================ */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el    = entry.target;
    const delay = parseInt(el.dataset.stagger || '0', 10);
    setTimeout(() => el.classList.add('in'), delay);
    revealObserver.unobserve(el);
  });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

document.querySelectorAll('.reveal, .reveal-card').forEach(el => revealObserver.observe(el));

/* ================================================================
   4. NEURAL-NET CANVAS
   Nodes drift slowly; lines form/dissolve by proximity.
   Mouse position gently leans the canvas (desktop only).
   Pauses when hero is scrolled out of view.
   ================================================================ */
(function initNeuralNet() {
  const canvas = document.getElementById('neural-canvas');
  if (!canvas || REDUCED) return;

  const ctx        = canvas.getContext('2d');
  const NODE_COUNT = IS_MOBILE ? 30 : 65;
  const MAX_DIST   = IS_MOBILE ? 110 : 145;
  const SPEED      = 0.32;
  const NODE_COLOR = [59, 130, 246];   /* blue-mid rgb */
  const LINE_ALPHA = 0.18;             /* max connection opacity */
  const NODE_ALPHA = 0.55;            /* max node opacity */

  let W = 0, H = 0;
  let nodes = [];
  let running = true;
  let raf;

  /* Resize canvas to match element pixel size */
  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  /* Simple node object */
  function makeNode() {
    const angle = Math.random() * Math.PI * 2;
    const spd   = (0.5 + Math.random() * 0.5) * SPEED;
    return {
      x:  Math.random() * W,
      y:  Math.random() * H,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      r:  Math.random() * 1.6 + 0.6,
      a:  Math.random() * 0.35 + 0.15,
    };
  }

  function init() { resize(); nodes = Array.from({ length: NODE_COUNT }, makeNode); }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const [r, g, b] = NODE_COLOR;

    /* Update positions — bounce off walls */
    nodes.forEach(n => {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0)  { n.x = 0;  n.vx *= -1; }
      if (n.x > W)  { n.x = W;  n.vx *= -1; }
      if (n.y < 0)  { n.y = 0;  n.vy *= -1; }
      if (n.y > H)  { n.y = H;  n.vy *= -1; }
    });

    /* Draw connections (formed/dissolved by proximity) */
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx   = nodes[i].x - nodes[j].x;
        const dy   = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= MAX_DIST) continue;
        const alpha = (1 - dist / MAX_DIST) * LINE_ALPHA;
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.stroke();
      }
    }

    /* Draw nodes */
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${n.a * NODE_ALPHA})`;
      ctx.fill();
    });
  }

  function tick() {
    if (!running) return;
    draw();
    raf = requestAnimationFrame(tick);
  }

  /* Pause canvas when hero is not in view */
  const heroEl = document.getElementById('hero');
  if (heroEl) {
    new IntersectionObserver(([entry]) => {
      running = entry.isIntersecting;
      if (running) { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
    }, { threshold: 0 }).observe(heroEl);
  }

  /* Save CPU when tab is hidden */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); running = false; }
    else { running = true; raf = requestAnimationFrame(tick); }
  });

  window.addEventListener('resize', () => {
    resize();
    nodes.forEach(n => { n.x = Math.min(n.x, W); n.y = Math.min(n.y, H); });
  }, { passive: true });

  init(); tick();
})();

/* ================================================================
   5. KINETIC HEADLINE REVEAL
   Words blur-in one by one, then shimmer sweep fires once.
   ================================================================ */
(function initHeadlineReveal() {
  const headline = document.getElementById('hero-headline');
  if (!headline) return;

  /* Reduced motion: show headline immediately, no effects */
  if (REDUCED) { headline.style.opacity = '1'; return; }

  /* Split text into word spans */
  const text  = headline.textContent.trim();
  const words = text.split(' ');
  /* "Future" (index 1) gets the blue accent class */
  headline.innerHTML = words
    .map((w, i) => `<span class="hero-word"><span class="word-inner${i === 1 ? ' word-blue' : ''}">${w}</span></span>`)
    .join(' ');

  const wordEls = headline.querySelectorAll('.word-inner');
  const STAGGER = 120;  /* ms between each word */
  const DELAY   = 380;  /* ms before first word */

  wordEls.forEach((el, i) => {
    setTimeout(() => {
      el.classList.add('revealed');
      /* last word revealed */
    }, DELAY + i * STAGGER);
  });
})();

/* ================================================================
   6. PARALLAX — scroll + mouse (desktop only)
   Three layers move at different depths on scroll and mouse.
   GPU-friendly: translate3d only (no layout triggers).
   ================================================================ */
(function initParallax() {
  if (REDUCED) return;

  const cardsLayer  = document.getElementById('prop-cards');
  const neuralLayer = document.getElementById('neural-canvas');
  const heroInner   = document.getElementById('hero-inner');

  let scrollY      = 0;
  let mouseX       = 0, mouseY = 0;         /* current lerped offsets */
  let targetMX     = 0, targetMY = 0;       /* mouse target offsets */
  let rafPending   = false;

  function applyTransforms() {
    /* Cards (deepest): slowest scroll, strongest mouse lean */
    if (cardsLayer) cardsLayer.style.transform =
      `translate3d(${-mouseX * 0.7}px, ${-mouseY * 0.55 + scrollY * 0.05}px, 0)`;

    /* Neural net (mid): medium scroll, medium lean */
    if (neuralLayer) neuralLayer.style.transform =
      `translate3d(${-mouseX * 0.45}px, ${-mouseY * 0.35 + scrollY * 0.1}px, 0)`;

    /* Content (front): minimal movement */
    if (heroInner) heroInner.style.transform =
      `translate3d(${-mouseX * 0.08}px, ${-mouseY * 0.06 + scrollY * 0.03}px, 0)`;

    rafPending = false;
  }

  /* Throttle with rAF */
  function request() {
    if (!rafPending) { rafPending = true; requestAnimationFrame(applyTransforms); }
  }

  /* Scroll handler */
  window.addEventListener('scroll', () => { scrollY = window.scrollY; request(); }, { passive: true });

  /* Mouse lean — desktop only, lerped for smoothness */
  if (!IS_MOBILE) {
    const LEAN_MAX = 16; /* px max canvas shift */

    document.addEventListener('mousemove', e => {
      /* Normalise to -1..1 from centre */
      targetMX = ((e.clientX / window.innerWidth)  - 0.5) * LEAN_MAX * 2;
      targetMY = ((e.clientY / window.innerHeight) - 0.5) * LEAN_MAX;
    }, { passive: true });

    /* Lerp loop for smooth easing */
    (function lerpMouse() {
      const ease = 0.055;
      mouseX += (targetMX - mouseX) * ease;
      mouseY += (targetMY - mouseY) * ease;
      request();
      requestAnimationFrame(lerpMouse);
    })();
  }
})();

/* ================================================================
   7. MAGNETIC CTA BUTTON — desktop only
   Button springs toward the cursor; snaps back on leave.
   ================================================================ */
(function initMagnetic() {
  if (IS_MOBILE || REDUCED) return;

  const btn = document.getElementById('hero-cta');
  if (!btn) return;

  const STRENGTH = 0.32;  /* fraction of offset applied */
  const SPRING   = 0.13;  /* lerp speed */

  let tx = 0, ty = 0;     /* target offsets */
  let cx = 0, cy = 0;     /* current (lerped) offsets */
  let raf;

  function spring() {
    cx += (tx - cx) * SPRING;
    cy += (ty - cy) * SPRING;
    btn.style.transform = `translate(${cx.toFixed(2)}px, ${cy.toFixed(2)}px)`;
    /* Keep animating while there's movement */
    if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) {
      raf = requestAnimationFrame(spring);
    }
  }

  btn.addEventListener('mousemove', e => {
    const rect = btn.getBoundingClientRect();
    tx = (e.clientX - (rect.left + rect.width  / 2)) * STRENGTH;
    ty = (e.clientY - (rect.top  + rect.height / 2)) * STRENGTH;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(spring);
  });

  btn.addEventListener('mouseleave', () => {
    tx = 0; ty = 0;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(spring);
  });
})();
