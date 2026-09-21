/* =========================================================
   NEXUS — Shared UI (app.js)
   Header / Footer / Toast / Product Modal / Reveal
   ========================================================= */
(function () {
  'use strict';
  const S = window.NexusStore;

  /* ---------------- icons ---------------- */
  const ICONS = {
    cpu:  '<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/></svg>',
    gpu:  '<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="17" height="10" rx="2"/><circle cx="8.5" cy="12" r="2.6"/><path d="M13.5 10v4M16 10v4M19 10l3-2v8l-3-2"/></svg>',
    ram:  '<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3 8h18v7H3z"/><path d="M6 15v3M10 15v3M14 15v3M18 15v3M7 11h2M11 11h2M15 11h2"/></svg>',
    ssd:  '<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="12" r="3.2"/><path d="M12 6.5v1.8M12 15.7v1.8M7 12h1.6M15.4 12H17"/></svg>',
    disp: '<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="2.5" y="4" width="19" height="12.5" rx="2"/><path d="M9 20.5h6M12 16.5v4"/></svg>',
    bat:  '<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="8" width="17" height="9" rx="2.5"/><path d="M21.5 11v3M5.5 12h4l-1.4 2.8 4-3.6h-3.2L10.5 9"/></svg>',
    case: '<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="2"/><circle cx="12" cy="14" r="3.4"/><path d="M9 6h6"/></svg>',
    cart: '<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="17.5" cy="20" r="1.4"/><path d="M2.5 3h2.2l2.5 12.2a1.6 1.6 0 0 0 1.6 1.3h8.9a1.6 1.6 0 0 0 1.6-1.2L21.5 7H6"/></svg>',
    user: '<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.5c1.2-3.6 4.1-5.4 7.5-5.4s6.3 1.8 7.5 5.4"/></svg>',
    menu: '<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    x:    '<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    check:'<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5L19.5 7"/></svg>',
    plus: '<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    eye:  '<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/></svg>',
    trash:'<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M9.5 7V4.8h5V7M6.5 7l1 13.2h9L17.5 7M10 11v5.4M14 11v5.4"/></svg>',
    upload:'<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16.5V19a1.8 1.8 0 0 0 1.8 1.8h12.4A1.8 1.8 0 0 0 20 19v-2.5"/></svg>',
    box:  '<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8.2 12 3 3 8.2v7.6L12 21l9-5.2z"/><path d="M3.4 8.4 12 13.3l8.6-4.9M12 13.3V21"/></svg>',
    tag:  '<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.4"/></svg>',
    star: '<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.3L12 17.1l-5.7 3.1 1.2-6.3L2.8 9.5l6.4-.8z"/></svg>',
    shield:'<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.8 4.5 5.6v6c0 4.6 3.2 8 7.5 9.6 4.3-1.6 7.5-5 7.5-9.6v-6z"/><path d="M9 12l2.2 2.2L15.5 9.8"/></svg>',
    truck:'<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6h11.5v10H2.5zM14 9.5h4l3 3.5v3h-7"/><circle cx="6.5" cy="17.8" r="1.7"/><circle cx="17" cy="17.8" r="1.7"/></svg>',
    headset:'<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13a8 8 0 0 1 16 0"/><rect x="3" y="13" width="4" height="6" rx="1.6"/><rect x="17" y="13" width="4" height="6" rx="1.6"/><path d="M19 19v1a2 2 0 0 1-2 2h-4"/></svg>',
    arrow:'<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    arrowL:'<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    pin:  '<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.5s-7-6.4-7-11.5a7 7 0 0 1 14 0c0 5.1-7 11.5-7 11.5z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    phone:'<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16.9v2.6a1.8 1.8 0 0 1-2 1.8 18 18 0 0 1-7.8-2.8 17.6 17.6 0 0 1-5.4-5.4A18 18 0 0 1 3 5.2 1.8 1.8 0 0 1 4.8 3.3h2.6a1.8 1.8 0 0 1 1.8 1.5c.12.9.34 1.8.65 2.6a1.8 1.8 0 0 1-.4 1.9L8.3 10.5a14.4 14.4 0 0 0 5.4 5.4l1.2-1.2a1.8 1.8 0 0 1 1.9-.4c.84.3 1.7.53 2.6.65a1.8 1.8 0 0 1 1.6 1.95z"/></svg>',
    mail: '<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="3" y="5" width="18" height="14" rx="2.4"/><path d="m3.5 7 8.5 6 8.5-6"/></svg>',
    clock:'<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 1.9"/></svg>',
    doc:  '<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M6 2.5h8L19 7.5V21a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 21V4a1.5 1.5 0 0 1 1-1.5z"/><path d="M9 12h6M9 16h6M9 8h2"/></svg>',
    receipt:'<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M5 2.8h14V21l-2.4-1.6L14.2 21l-2.2-1.6L9.8 21l-2.4-1.6L5 21z"/><path d="M9 8h6M9 12h6"/></svg>',
    camera:'<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.2A1.8 1.8 0 0 1 4.8 6.4h2.5L9 4h6l1.7 2.4h2.5A1.8 1.8 0 0 1 21 8.2v10A1.8 1.8 0 0 1 19.2 20H4.8A1.8 1.8 0 0 1 3 18.2z"/><circle cx="12" cy="13" r="3.6"/></svg>',
    info: '<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.4M12 7.6v.2"/></svg>',
    cpu: '<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2.8v3.2M15 2.8v3.2M9 18v3.2M15 18v3.2M2.8 9h3.2M2.8 15h3.2M18 9h3.2M18 15h3.2"/></svg>',
    wallet:'<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2.6"/><path d="M3 10h18M16.4 14.6h.2"/><path d="M17 6V4.8a1.8 1.8 0 0 0-2.2-1.75L5.4 5.2"/></svg>',
    lock: '<svg width="__S__" height="__S__" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10" width="15" height="10.5" rx="2.4"/><path d="M8 10V7.6a4 4 0 0 1 8 0V10"/><circle cx="12" cy="15.2" r="1.4"/></svg>',
  };

  function icon(name, size) {
    const s = size || 20;
    return (ICONS[name] || ICONS.box).split('__S__').join(s);
  }
  window.NexusIcon = icon;

  /* ---------------- header / footer ---------------- */
  function pageKey() {
    const f = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (f.includes('cart')) return 'cart';
    if (f.includes('admin')) return 'admin';
    if (f.includes('about')) return 'about';
    return 'home';
  }

  function renderHeader() {
    const key = pageKey();
    const header = document.createElement('header');
    header.className = 'site-header';
    header.id = 'siteHeader';
    const logoSvg = `<svg width="26" height="26" viewBox="0 0 26 26" fill="none"><rect x="1.5" y="1.5" width="23" height="23" rx="7" stroke="url(#lg)" stroke-width="2"/><path d="M8 17.5V9l5 5.4L18 9v8.5" stroke="url(#lg)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><defs><linearGradient id="lg" x1="0" y1="0" x2="26" y2="26"><stop stop-color="#7cc4ff"/><stop offset="1" stop-color="#3d8bd6"/></linearGradient></defs></svg>`;
    header.innerHTML = `
      <div class="container nav-inner">
        <a class="brand" href="index.html">${logoSvg}<span>NEXUS</span></a>
        <nav class="nav-links" aria-label="ناوبری اصلی">
          <a href="index.html#store" data-k="home">فروشگاه</a>
          <a href="about.html" data-k="about">درباره ما</a>
          <a href="admin.html" data-k="admin">پنل مدیریت</a>
        </nav>
        <div class="nav-spacer"></div>
        <div class="nav-actions">
          <a class="icon-btn" href="admin.html" title="پنل مدیریت" aria-label="پنل مدیریت">${icon('user',19)}</a>
          <a class="icon-btn" href="cart.html" title="سبد خرید" aria-label="سبد خرید">
            ${icon('cart',19)}
            <span class="cart-badge" data-cart-badge>۰</span>
          </a>
          <button class="icon-btn burger" id="burgerBtn" aria-label="منو">${icon('menu',20)}</button>
        </div>
      </div>
      <div class="mobile-menu" id="mobileMenu">
        <a href="index.html#store" data-k="home">فروشگاه</a>
        <a href="about.html" data-k="about">درباره ما</a>
        <a href="cart.html" data-k="cart">سبد خرید</a>
        <a href="admin.html" data-k="admin">پنل مدیریت</a>
      </div>`;
    document.body.prepend(header);

    header.querySelectorAll('[data-k]').forEach((a) => {
      if (a.dataset.k === key) a.classList.add('active');
    });

    const burger = header.querySelector('#burgerBtn');
    const menu = header.querySelector('#mobileMenu');
    burger.addEventListener('click', () => menu.classList.toggle('open'));
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => menu.classList.remove('open')));

    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function renderFooter() {
    const f = document.createElement('footer');
    f.className = 'site-footer';
    const logoSvg = `<svg width="24" height="24" viewBox="0 0 26 26" fill="none"><rect x="1.5" y="1.5" width="23" height="23" rx="7" stroke="#7cc4ff" stroke-width="2"/><path d="M8 17.5V9l5 5.4L18 9v8.5" stroke="#7cc4ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    f.innerHTML = `
      <div class="container">
        <div class="footer-grid">
          <div>
            <div class="footer-brand">${logoSvg}<span>NEXUS</span></div>
            <p>مرجع تخصصی لپ‌تاپ و کامپیوتر در ایران. بیش از یک دهه تجربه در واردات، تست و پشتیبانی سخت‌افزار حرفه‌ای — با ضمانت اصالت کالا و ۷ روز بازگشت بی‌قید و شرط.</p>
          </div>
          <div>
            <h4>دسترسی سریع</h4>
            <a href="index.html#store">فروشگاه</a><br>
            <a href="cart.html">سبد خرید</a><br>
            <a href="about.html">درباره ما</a><br>
            <a href="admin.html">پنل مدیریت</a>
          </div>
          <div>
            <h4>خدمات مشتریان</h4>
            <a href="about.html#terms">شرایط خرید و ضمانت</a><br>
            <a href="about.html#license">مجوزها</a><br>
            <a href="about.html#visit">بازدید حضوری</a><br>
            <a href="cart.html">پیگیری سفارش</a>
          </div>
          <div>
            <h4>تماس با ما</h4>
            <p>
              ${icon('phone',15)} ۰۲۱-۹۱۰۱۲۳۴۵<br>
              ${icon('mail',15)} orders@nexus-shop.ir<br>
              ${icon('pin',15)} تهران، خیابان ولیعصر، برج نگین، طبقه ۴
            </p>
          </div>
        </div>
        <div class="footer-bottom">
          <div>© ۱۴۰۵ فروشگاه نکسوس — تمامی حقوق محفوظ است.</div>
          <div class="enamd">${icon('shield',16)} دارای مجوز رسمی از اتحادیه رایانه‌ای کشور · نماد اعتماد الکترونیکی</div>
        </div>
      </div>`;
    document.body.append(f);
  }

  /* ---------------- toast ---------------- */
  let toastWrap = null;
  function toast(msg, type) {
    if (!toastWrap) {
      toastWrap = document.createElement('div');
      toastWrap.className = 'toast-wrap';
      document.body.append(toastWrap);
    }
    const t = document.createElement('div');
    t.className = 'toast ' + (type === 'err' ? 'err' : 'ok');
    t.innerHTML = `<span class="t-ico">${icon(type === 'err' ? 'x' : 'check', 13)}</span><span>${S.esc(msg)}</span>`;
    toastWrap.append(t);
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 320);
    }, 2600);
  }
  window.nexusToast = toast;

  /* ---------------- product quick-view modal ---------------- */
  function openProductModal(id) {
    const p = S.getProduct(id);
    if (!p) return;
    closeProductModal();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'pmOverlay';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <button class="modal-close" data-close aria-label="بستن">${icon('x',16)}</button>
        <div class="pm-layout">
          <div class="pm-media">
            <img src="${p.image}" alt="${S.esc(p.name_fa || p.name)}">
            ${p.badge ? `<span class="badge">${S.esc(p.badge)}</span>` : ''}
          </div>
          <div class="pm-info">
            <div class="pm-cat">${S.esc(p.category_fa || '')}</div>
            <h3>${S.esc(p.name_fa || '')} <span style="color:var(--ink3);font-size:15px">${S.esc(p.name || '')}</span></h3>
            <div class="pm-rating">
              <span>${S.stars(p.rating)}</span>
              <span>${S.faNum(p.rating || 0)}</span>
              <span class="sold">· ${S.faNum(p.sold || 0)} فروش موفق</span>
              <span class="sold">· موجودی: ${S.faNum(p.stock || 0)}</span>
            </div>
            <p class="pm-desc">${S.esc(p.desc || '')}</p>
            ${(p.highlights && p.highlights.length) ? `
            <ul class="pm-highlights">
              ${p.highlights.map((h) => `<li>${icon('check',14)}<span>${S.esc(h)}</span></li>`).join('')}
            </ul>` : ''}
            <div class="pm-specs">
              ${(p.specs || []).slice(0, 3).map((sp) => `
                <div class="sp">
                  <div class="l" style="display:flex;align-items:center;gap:6px">${icon(sp.icon || 'cpu', 13)} ${S.esc(sp.label)}</div>
                  <div class="v">${S.esc(sp.value)}</div>
                </div>`).join('')}
            </div>
            <div class="pm-fullspecs">
              ${(p.specs || []).slice(3).map((sp) => `
                <div class="row">
                  <span class="k">${S.esc(sp.label)}</span>
                  <span class="v">${S.esc(sp.value)}</span>
                </div>`).join('')}
            </div>
            <div class="pm-price-row">
              <div>
                ${p.oldPrice ? `<span class="price-old">${S.toman(p.oldPrice)}</span>` : ''}
                <div class="price">${S.toman(p.price)}</div>
              </div>
              <div class="pm-actions">
                <div class="qty">
                  <button data-q="-1" aria-label="کاهش">−</button>
                  <span id="pmQty">۱</span>
                  <button data-q="1" aria-label="افزایش">+</button>
                </div>
                <button class="btn btn-primary" id="pmAdd">${icon('cart',17)} افزودن به سبد</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    document.body.append(overlay);

    let qty = 1;
    const qtyEl = overlay.querySelector('#pmQty');
    overlay.querySelectorAll('[data-q]').forEach((b) => {
      b.addEventListener('click', () => {
        qty = Math.max(1, Math.min(p.stock || 99, qty + (+b.dataset.q)));
        qtyEl.textContent = S.faNum(qty);
      });
    });
    overlay.querySelector('#pmAdd').addEventListener('click', () => {
      S.addToCart(p.id, qty);
      toast('به سبد خرید اضافه شد');
      closeProductModal();
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.closest('[data-close]')) closeProductModal();
    });
    document.addEventListener('keydown', pmEsc);
    requestAnimationFrame(() => overlay.classList.add('open'));
  }

  function pmEsc(e) { if (e.key === 'Escape') closeProductModal(); }
  function closeProductModal() {
    const m = document.getElementById('pmOverlay');
    if (m) { m.classList.remove('open'); setTimeout(() => m.remove(), 280); }
    document.removeEventListener('keydown', pmEsc);
  }

  /* =========================================================
     SUPPORT CHAT WIDGET
     ========================================================= */
  let chatOpen = false;
  let chatEl = null;

  function chatTime(ts) { return S.faTime(ts); }

  function renderChatBody() {
    if (!chatEl) return;
    const tid = S.ensureVisitorId ? S.ensureVisitorId() : 'v1';
    const thread = S.getThreads().find((t) => t.id === tid);
    const list = chatEl.querySelector('#chatMsgs');
    const msgs = thread ? thread.messages : [];
    list.innerHTML = `
      <div class="chat-welcome">سلام! 👋 اینجا پشتیبانی نکسوس است.
      سوال خود را بنویسید، کارشناسان ما در سریع‌ترین زمان پاسخ می‌دهند.</div>` +
      msgs.map((m) => `
        <div class="chat-msg ${m.from === 'admin' ? 'admin' : 'me'}">
          <div class="cm-bubble">${S.esc(m.text)}</div>
          <div class="cm-time">${chatTime(m.at)}</div>
        </div>`).join('');
    list.scrollTop = list.scrollHeight;
    S.markRead(tid, 'user');
  }

  function toggleChat(force) {
    chatOpen = force != null ? force : !chatOpen;
    if (!chatEl) return;
    chatEl.classList.toggle('open', chatOpen);
    if (chatOpen) {
      renderChatBody();
      updateFabBadge();
      setTimeout(() => chatEl.querySelector('#chatInput').focus(), 250);
    }
  }

  function initChat() {
    const fab = document.createElement('button');
    fab.className = 'chat-fab';
    fab.setAttribute('aria-label', 'چت پشتیبانی');
    fab.innerHTML = `
      <span class="fab-ico fab-chat">${icon('headset', 22)}</span>
      <span class="fab-ico fab-x">${icon('x', 20)}</span>
      <span class="fab-badge" id="chatFabBadge" style="display:none"></span>`;
    document.body.append(fab);

    chatEl = document.createElement('div');
    chatEl.className = 'chat-panel';
    chatEl.innerHTML = `
      <div class="chat-head">
        <div class="ch-ava">${icon('headset', 20)}</div>
        <div class="ch-title">
          <b>پشتیبانی نکسوس</b>
          <span><i class="online-dot"></i> آنلاین — معمولاً زیر ۱۵ دقیقه پاسخ می‌دهیم</span>
        </div>
        <button class="ch-close" aria-label="بستن چت">${icon('x', 16)}</button>
      </div>
      <div class="chat-msgs" id="chatMsgs"></div>
      <div class="chat-status" id="chatStatus"></div>
      <form class="chat-input" id="chatForm">
        <input type="text" id="chatInput" placeholder="پیام خود را بنویسید…" maxlength="1000" autocomplete="off">
        <button type="submit" aria-label="ارسال">${icon('arrowL', 18)}</button>
      </form>`;
    document.body.append(chatEl);

    fab.addEventListener('click', () => toggleChat());
    chatEl.querySelector('.ch-close').addEventListener('click', () => toggleChat(false));

    chatEl.querySelector('#chatForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const inp = chatEl.querySelector('#chatInput');
      const text = inp.value.trim();
      if (!text) return;
      S.sendMessage(text, 'user');
      inp.value = '';
      renderChatBody();

      /* cloud sync — the message travels to the admin panel */
      if (S.pushChat) {
        S.pushChat().then(() => {
          const st = chatEl.querySelector('#chatStatus');
          if (st) {
            st.textContent = '✓ پیام به پشتیبانی ارسال شد';
            st.classList.add('on');
            setTimeout(() => { st.textContent = ''; st.classList.remove('on'); }, 4000);
          }
        }).catch(() => {
          const st = chatEl.querySelector('#chatStatus');
          if (st) {
            st.textContent = 'پیام ذخیره شد؛ ارسال ابری ناموفق بود';
            setTimeout(() => { st.textContent = ''; }, 4000);
          }
        });
      }
    });

    /* live sync — admin replies appear without reload
       (local tabs via storage event, cross-device via cloud poll) */
    window.addEventListener('storage', (e) => {
      if (e.key === 'nexus.chat.v1') {
        if (chatOpen) renderChatBody();
        updateFabBadge();
      }
    });
    let lastCloudReply = 0;
    if (S.pullSlot && S.getSlot) {
      setInterval(() => {
        S.pullSlot(S.getSlot()).then((data) => {
          if (!data || !data.chat) return;
          const tid = S.ensureVisitorId();
          const mine = (data.chat || []).find((t) => t.id === tid);
          if (!mine) return;
          const n = (mine.messages || []).filter((m) => m.from === 'admin').length;
          if (n > lastCloudReply && lastCloudReply !== 0) {
            /* refresh thread from cloud so the reply shows up locally too */
            S.mergeChatRemote ? S.mergeChatRemote(data.chat) : null;
            if (chatOpen) renderChatBody();
          }
          lastCloudReply = n;
          updateFabBadge();
        }).catch(() => {});
      }, 20000);
    }

    updateFabBadge();
  }

  function updateFabBadge() {
    const n = S.userUnreadCount ? S.userUnreadCount() : 0;
    const b = document.getElementById('chatFabBadge');
    if (b) { b.textContent = S.faNum(n); b.style.display = n > 0 ? 'grid' : 'none'; }
  }

  /* ---------------- reveal on scroll ---------------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.12 });
  function observeReveals(root) {
    (root || document).querySelectorAll('.reveal:not(.in)').forEach((el) => io.observe(el));
  }

  /* ---------------- product card renderer (shared) ---------------- */
  function productCard(p) {
    const el = document.createElement('article');
    el.className = 'pcard reveal';
    el.innerHTML = `
      <div class="pcard-media">
        <img src="${p.image}" alt="${S.esc(p.name_fa || p.name)}" loading="lazy">
        ${p.badge ? `<span class="badge">${S.esc(p.badge)}</span>` : ''}
      </div>
      <div class="pcard-body">
        <div class="pcard-cat">${S.esc(p.category_fa || '')}</div>
        <h3 class="pcard-name"><a href="javascript:void 0" data-open="${p.id}">${S.esc(p.name_fa || p.name)}</a></h3>
        <div class="pcard-meta">
          <span>${S.stars(p.rating)}</span>
          <span class="sold">${S.faNum(p.sold || 0)} فروش</span>
        </div>
        <div class="pcard-foot">
          <div>
            ${p.oldPrice ? `<span class="price-old">${S.toman(p.oldPrice)}</span>` : ''}
            <div class="price">${S.toman(p.price)}</div>
          </div>
          <button class="add-btn" data-add="${p.id}" title="افزودن سریع به سبد" aria-label="افزودن به سبد">${icon('plus',18)}</button>
        </div>
      </div>`;
    el.querySelector('[data-open]').addEventListener('click', () => openProductModal(p.id));
    el.querySelector('[data-add]').addEventListener('click', (e) => {
      e.stopPropagation();
      S.addToCart(p.id, 1);
      toast('به سبد خرید اضافه شد');
    });
    return el;
  }

  /* ---------------- boot ---------------- */
  document.addEventListener('DOMContentLoaded', () => {
    renderHeader();
    renderFooter();
    S.updateCartBadge();
    observeReveals();
    initChat();
  });

  /* ---------------- export ---------------- */
  window.NexusUI = {
    icon, toast, openProductModal, closeProductModal, observeReveals, productCard,
  };
})();
