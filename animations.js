// ── Ocultar watermark de Spline (shadow DOM) ─────────────
(function () {
  function hide(viewer) {
    const root = viewer.shadowRoot;
    if (!root) return false;
    const el =
      root.querySelector('#logo') ||
      root.querySelector('a[href*="spline"]') ||
      root.querySelector('[class*="logo"]');
    if (el) {
      el.style.visibility = 'hidden';
      el.style.pointerEvents = 'none';
      return true;
    }
    return false;
  }

  document.querySelectorAll('spline-viewer').forEach(function (viewer) {
    if (hide(viewer)) return;
    // El componente carga async — observar hasta que aparezca
    viewer.addEventListener('load', function () { hide(viewer); });
    var mo = new MutationObserver(function () {
      if (hide(viewer)) mo.disconnect();
    });
    mo.observe(viewer, { childList: true, subtree: true });
    // Fallback por si tarda más
    [500, 1500, 3000].forEach(function (ms) {
      setTimeout(function () { hide(viewer); }, ms);
    });
  });
})();

// ── Scroll 3D tilt (ContainerScroll equivalent) ──────────
(function () {
  const card = document.getElementById('scroll-tilt-card');
  const header = document.querySelector('.scroll-tilt-header');
  if (!card) return;

  const isMobile = () => window.innerWidth <= 768;

  function update() {
    const wrapper = card.closest('.scroll-tilt-wrapper');
    const rect = wrapper.getBoundingClientRect();
    const viewH = window.innerHeight;

    // progress 0 → card enters viewport bottom, 1 → card centre reaches viewport centre
    const raw = 1 - (rect.top + rect.height * 0.3) / viewH;
    const p = Math.max(0, Math.min(1, raw));

    const maxRotate = isMobile() ? 8 : 20;
    const rotateX   = maxRotate * (1 - p);
    const scale     = isMobile()
      ? 0.9 + 0.1 * p          // mobile: 0.9 → 1.0
      : 1.05 - 0.05 * p;       // desktop: 1.05 → 1.0

    card.style.transform = `rotateX(${rotateX}deg) scale(${scale})`;

    if (header) {
      const ty = -p * 60;
      header.style.transform = `translateY(${ty}px)`;
    }
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

// ── Spotlight cursor — smooth lerp follow ────────────────
(function () {
  const el = document.querySelector('.spotlight-cursor');
  if (!el || window.matchMedia('(max-width:600px)').matches) return;

  let tx = -9999, ty = -9999;
  let cx = tx, cy = ty;

  document.addEventListener('mousemove', (e) => {
    tx = e.clientX - 200;
    ty = e.clientY - 200;
  });

  (function tick() {
    cx += (tx - cx) * 0.09;
    cy += (ty - cy) * 0.09;
    el.style.transform = `translate(${cx}px,${cy}px)`;
    requestAnimationFrame(tick);
  })();
})();

// Card spotlight — track mouse per card
document.addEventListener('mousemove', (e) => {
  document.querySelectorAll('.result-card').forEach((card) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
    card.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
  });
});

// Scroll reveal — IntersectionObserver
(function () {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll('.scroll-reveal').forEach((el) => io.observe(el));
})();

// Tilt on how-grid articles (subtle 3-D feel)
document.querySelectorAll('.how-grid article').forEach((card) => {
  card.addEventListener('mousemove', (e) => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `translateY(-4px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

// ── Search Bubble MorphPanel ──────────────────────────────
// Animates width + height + border-radius from pill → form
(function () {
  var outer  = document.getElementById('search-bubble-outer');
  var panel  = document.getElementById('search-bubble-panel');
  var dock   = document.getElementById('search-bubble-dock');
  var form   = document.getElementById('search-form');
  var input  = document.getElementById('query');
  if (!panel || !dock || !form) return;

  var isOpen     = false;
  var pillW      = 0;
  var PILL_H     = 44;
  var RADIUS_OPEN = 16;
  var EASE_OPEN  = 'cubic-bezier(0.22,1,0.36,1)';
  var EASE_CLOSE = 'cubic-bezier(0.55,0,1,0.45)';

  function storePillSize() {
    pillW = panel.offsetWidth;
  }
  storePillSize();

  function getExpandedSize() {
    // Temporarily show form to measure height
    panel.style.overflow = 'visible';
    form.style.opacity = '0';
    form.style.pointerEvents = 'none';
    form.style.display = 'flex';
    var h = form.offsetHeight;
    form.style.display = '';
    form.style.opacity = '';
    form.style.pointerEvents = '';
    panel.style.overflow = 'hidden';
    return { w: outer.offsetWidth, h: h };
  }

  function openBubble() {
    if (isOpen) return;
    isOpen = true;

    var target = getExpandedSize();

    // Freeze current pill dimensions as explicit px
    panel.style.transition = 'none';
    panel.style.width  = pillW + 'px';
    panel.style.height = PILL_H + 'px';
    panel.style.borderRadius = '999px';

    // Force layout flush
    panel.getBoundingClientRect();

    // Animate to expanded
    panel.style.transition =
      'width 0.42s ' + EASE_OPEN + ',' +
      'height 0.42s ' + EASE_OPEN + ',' +
      'border-radius 0.42s ' + EASE_OPEN + ',' +
      'border-color 0.2s';
    panel.style.width  = target.w + 'px';
    panel.style.height = target.h + 'px';
    panel.style.borderRadius = RADIUS_OPEN + 'px';
    panel.classList.add('is-open');

    setTimeout(function () { input && input.focus(); }, 200);
  }

  function closeBubble() {
    if (!isOpen) return;
    isOpen = false;
    panel.classList.remove('is-open');

    panel.style.transition =
      'width 0.34s ' + EASE_CLOSE + ',' +
      'height 0.34s ' + EASE_CLOSE + ',' +
      'border-radius 0.34s ' + EASE_CLOSE + ',' +
      'border-color 0.2s';
    panel.style.width  = pillW + 'px';
    panel.style.height = PILL_H + 'px';
    panel.style.borderRadius = '999px';

    // Re-center after close transition
    panel.addEventListener('transitionend', function handler() {
      panel.removeEventListener('transitionend', handler);
      panel.style.transition = '';
      panel.style.width  = '';
      panel.style.height = '';
      panel.style.borderRadius = '';
      storePillSize(); // refresh pill width in case of resize
    });
  }

  // Dock click opens
  dock.addEventListener('click', openBubble);

  // Escape closes
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) closeBubble();
  });

  // Click outside closes
  document.addEventListener('mousedown', function (e) {
    if (isOpen && !panel.contains(e.target)) closeBubble();
  });

  // After submit: close back to bubble
  form.addEventListener('submit', function () {
    setTimeout(closeBubble, 80);
  });

  // Recompute pill width on resize
  window.addEventListener('resize', function () {
    if (!isOpen) storePillSize();
  });
})();

// ── MorphPanel chat input ─────────────────────────────────
(function () {
  var outer    = document.getElementById('chat-morph-outer');
  var pill     = document.getElementById('chat-morph-pill');
  var cancel   = document.getElementById('chat-morph-cancel');
  var form     = document.getElementById('chat-form');
  var textarea = document.getElementById('chat-input');
  if (!outer || !pill) return;

  function open() {
    outer.classList.add('is-open');
    form.removeAttribute('aria-hidden');
    setTimeout(function () { textarea && textarea.focus(); }, 50);
  }

  function close() {
    outer.classList.remove('is-open');
    form.setAttribute('aria-hidden', 'true');
  }

  pill.addEventListener('click', open);
  if (cancel) cancel.addEventListener('click', close);

  if (textarea) {
    textarea.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (form.requestSubmit) form.requestSubmit();
        else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    });
  }

  // Click outside to close
  document.addEventListener('mousedown', function (e) {
    if (outer.classList.contains('is-open') && !outer.contains(e.target)) {
      close();
    }
  });

  // Open automatically when a chat-chip is clicked
  document.querySelectorAll('.chat-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      if (!outer.classList.contains('is-open')) open();
    });
  });
})();

// Magnetic button — search submit
(function () {
  const btn = document.querySelector('.search-box button[type="submit"]');
  if (!btn) return;
  btn.addEventListener('mousemove', (e) => {
    const r = btn.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * 0.25;
    const y = (e.clientY - r.top - r.height / 2) * 0.25;
    btn.style.transform = `translate(${x}px,${y}px)`;
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = '';
  });
})();
