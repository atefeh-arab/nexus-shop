/* =========================================================
   NEXUS — Hero scroll timeline (hero.js)
   Desktop (>720px): closed lid → opens → screen wakes → specs → zoom out
   Mobile (≤720px) / reduced motion: simple static open laptop, no timeline
   ========================================================= */
(function () {
  'use strict';

  /* build keyboard rows */
  (function buildKeys() {
    const k = document.getElementById('keyboard');
    if (!k) return;
    const cols = [14, 14, 14, 14, 10];
    for (let r = 0; r < 5; r++) {
      const row = document.createElement('div');
      row.className = 'krow';
      row.style.gridTemplateColumns = `repeat(${cols[r]}, 1fr)`;
      for (let c = 0; c < cols[r]; c++) {
        const key = document.createElement('div');
        key.className = 'key';
        row.appendChild(key);
      }
      k.appendChild(row);
    }
  })();

  let stInstance = null;   /* active ScrollTrigger */
  let currentMode = null;  /* 'simple' | 'scroll' */

  function els() {
    return {
      heroTop: document.getElementById('heroTop'),
      heroBot: document.getElementById('heroBot'),
      laptop:  document.getElementById('laptop'),
      camera:  document.getElementById('camera'),
      lid:     document.getElementById('lid'),
      screen:  document.getElementById('screen'),
      ui:      document.getElementById('ui'),
      specs:   gsap.utils.toArray('#uiGrid .spec'),
      glow:    document.getElementById('glow'),
      shadow:  document.querySelector('.hero-stage .shadow'),
      railBar: document.getElementById('railBar'),
      railNum: document.getElementById('railNum'),
    };
  }

  function isSimpleMode() {
    return window.matchMedia('(max-width: 720px)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function setSimple() {
    const e = els();
    gsap.set(e.lid,    { rotateX: 12, transformOrigin: '50% 100%' });
    gsap.set(e.laptop, { rotateX: 10 });
    gsap.set(e.camera, { scale: 1, y: 0 });
    gsap.set([e.screen, e.ui, e.glow], { opacity: 1 });
    gsap.set(e.specs,  { opacity: 1, y: 0 });
    gsap.set(e.heroTop, { opacity: 1, y: 0 });
    gsap.set(e.heroBot, { opacity: 1 });
    currentMode = 'simple';
  }

  function setScroll() {
    const e = els();

    /* initial state — closed: lid lies on the deck, screen facing keyboard */
    gsap.set(e.lid,    { rotateX: -86, transformOrigin: '50% 100%' });
    gsap.set(e.laptop, { rotateX: 18, scale: 1, y: 0 });
    gsap.set(e.camera, { y: 0, scale: 1 });
    gsap.set(e.screen, { opacity: 0 });
    gsap.set(e.ui,     { opacity: 0 });
    gsap.set(e.specs,  { opacity: 0, y: 10 });
    gsap.set(e.glow,   { opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#heroScroll',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
        pin: '#heroStage',
        pinSpacing: false,
        anticipatePin: 1,
        onUpdate: (self) => {
          const p = Math.round(self.progress * 100);
          if (e.railBar) e.railBar.style.height = p + '%';
          if (e.railNum) e.railNum.textContent = String(Math.min(99, p)).padStart(2, '0');
        },
      },
    });
    stInstance = tl.scrollTrigger;

    /* Phase 1 — hold closed (0 → ~8%) */
    tl.to(e.heroBot, { opacity: 1, duration: 0.5 }, 0);

    /* Phase 2 — lid swings open: -86° (closed) → +12° (~102° open) */
    tl.to(e.lid,   { rotateX: 12, ease: 'power2.inOut', duration: 4.5 }, 1.0)
      .to(e.laptop, { rotateX: 22, ease: 'power2.inOut', duration: 4.5 }, 1.0)
      .to(e.heroBot, { opacity: 0, y: 20, duration: 1.0 }, 1.0)
      .to(e.heroTop, { y: -30, duration: 3.0, ease: 'none' }, 1.0);

    /* Phase 3 — screen wakes */
    tl.to(e.screen, { opacity: 1, filter: 'brightness(1.15)', ease: 'power2.out', duration: 1.2 }, 4.5)
      .to(e.glow,   { opacity: 1, ease: 'power2.out', duration: 1.2 }, 4.5)
      .to(e.ui,     { opacity: 1, ease: 'power2.out', duration: 1.0 }, 5.0);

    /* Phase 4 — spec tiles stagger in */
    tl.to(e.specs, { opacity: 1, y: 0, stagger: 0.35, ease: 'power2.out', duration: 1.6 }, 5.4);

    /* Phase 5 — gentle zoom out; store slides up over the still-lit laptop */
    tl.to(e.heroTop, { y: -140, opacity: 0, ease: 'power2.in', duration: 1.6 }, 7.4)
      .to(e.camera, { scale: 0.62, y: -44, ease: 'power2.inOut', duration: 2.2 }, 7.4)
      .to(e.laptop, { rotateX: 15, ease: 'power2.inOut', duration: 2.2 }, 7.4)
      .to(e.glow, { opacity: 0.45, ease: 'power2.inOut', duration: 2.2 }, 7.4);

    currentMode = 'scroll';
  }

  function teardown() {
    if (stInstance) { stInstance.kill(false); stInstance = null; }
    gsap.set('#heroStage', { clearProps: 'all' });
    const e = els();
    gsap.set([e.lid, e.laptop, e.camera, e.screen, e.ui, e.glow, e.heroTop, e.heroBot].concat(e.specs), { clearProps: 'all' });
    currentMode = null;
  }

  function init() {
    const want = isSimpleMode() ? 'simple' : 'scroll';
    if (want === currentMode) return;
    teardown();
    if (want === 'simple') setSimple(); else setScroll();
  }

  /* boot when GSAP + DOM are ready */
  function boot() { init(); ScrollTrigger.refresh(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  window.addEventListener('load', () => ScrollTrigger.refresh());

  /* re-init when crossing the breakpoint */
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 200);
  });
})();
