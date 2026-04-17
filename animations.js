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
