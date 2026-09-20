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
  let clampY = 0;          /* currently-applied anti-collision shift  */
  let clampScale = 1;      /* currently-applied anti-collision scale  */

  function els() {
    return {
      heroTop: document.getElementById('heroTop'),
      heroBot: document.getElementById('heroBot'),
      laptop:  document.getElementById('laptop'),
      wrap:    document.getElementById('laptopWrap'),
      camera:  document.getElementById('camera'),
      lid:     document.getElementById('lid'),
      screen:  document.getElementById('screen'),
      ui:      document.getElementById('ui'),
      specs:   gsap.utils.toArray('#uiGrid .spec'),
      glow:    document.getElementById('glow'),
      heroBg:  document.getElementById('heroBg'),
      shadow:  document.querySelector('.hero-stage .shadow'),
      railBar: document.getElementById('railBar'),
      railNum: document.getElementById('railNum'),
    };
  }

  /* Anti-collision clamp: while the lid opens it swings toward the headline.
     Measure the real gap every frame; if it shrinks, drop the laptop down
     (and shrink slightly on very short screens) so text is never covered. */
  function applyLaptopClamp(e) {
    if (!e.laptop || !e.lid || !e.heroTop || !e.wrap) return;
    const vh = innerHeight;
    const txtBottom = e.heroTop.getBoundingClientRect().bottom;
    /* geometry with the current clamp removed ("unshifted" coordinates) */
    const lidTop0 = e.lid.getBoundingClientRect().top - clampY;
    const lidH0   = e.lid.getBoundingClientRect().height / clampScale;
    const minGap  = Math.max(28, vh * 0.05);          /* want ≥ ~5% of vh */
    const need    = minGap - (lidTop0 - txtBottom);   /* >0 → collision  */
    if (need > 0) {
      /* 1) drop the hinge (capped so the base stays visible) */
      const CAP = 160;
      const shift = Math.min(CAP, need);
      /* 2) still not clear? shrink around center so the top clears too */
      const remaining = need - shift;
      const cy0 = lidTop0 + lidH0 / 2;
      let s = 1;
      if (remaining > 0) s = Math.min(s, 1 - (2 * remaining) / lidH0);
      /* keep the base inside the viewport */
      const maxBottom = vh - 8;
      if (cy0 + (lidH0 * s) / 2 + shift > maxBottom) {
        s = Math.min(s, (2 * (maxBottom - shift - cy0)) / lidH0);
      }
      s = Math.max(0.68, Math.min(1, s));
      clampY = shift; clampScale = s;
      e.wrap.style.transform = shift ? `translateY(${shift.toFixed(1)}px)` : '';
      if (s < 1) e.laptop.style.scale = s.toFixed(3); else e.laptop.style.scale = '';
    } else if (clampY || clampScale !== 1) {
      clampY = 0; clampScale = 1;
      e.wrap.style.transform = '';
      e.laptop.style.scale = '';
    }
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
    const bg = document.getElementById('heroBg');
    if (bg) bg.classList.add('on');
    if (e.wrap) e.wrap.style.transform = '';
    e.laptop.style.scale = '';
    clampY = 0; clampScale = 1;
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
          applyLaptopClamp(e);
        },
      },
    });
    stInstance = tl.scrollTrigger;

    /* Phase 1 — hold closed (0 → ~8%) */
    tl.to(e.heroBot, { opacity: 1, duration: 0.5 }, 0);

    /* Phase 2 — lid swings open: -86° (closed) → +12° (~102° open).
       If the lid would reach the headline, applyLaptopClamp drops the
       laptop for those frames (see onUpdate) and it returns after. */
    tl.to(e.lid,   { rotateX: 12, ease: 'power2.inOut', duration: 4.5 }, 1.0)
      .to(e.laptop, { rotateX: 22, ease: 'power2.inOut', duration: 4.5 }, 1.0)
      .to(e.heroBot, { opacity: 0, y: 20, duration: 1.0 }, 1.0)
      /* text drifts DOWN as the lid rises, so they never collide */
      .to(e.heroTop, { y: 14, duration: 3.5, ease: 'none' }, 1.0);

    /* Phase 3 — screen wakes; the night scene behind it fades in too */
    tl.to(e.screen, { opacity: 1, filter: 'brightness(1.15)', ease: 'power2.out', duration: 1.2 }, 4.5)
      .to(e.glow,   { opacity: 1, ease: 'power2.out', duration: 1.2 }, 4.5)
      .to(e.ui,     { opacity: 1, ease: 'power2.out', duration: 1.0 }, 5.0)
      .add(() => {
        const bg = document.getElementById('heroBg');
        if (bg) bg.classList.add('on');
      }, 4.2);

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
    if (e.wrap) e.wrap.style.transform = '';
    if (e.laptop) e.laptop.style.scale = '';
    clampY = 0; clampScale = 1;
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
    resizeTimer = setTimeout(() => {
      init();
      if (currentMode === 'scroll' && stInstance) applyLaptopClamp(els());
    }, 200);
  });
})();
