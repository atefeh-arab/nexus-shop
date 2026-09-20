/* =========================================================
   NEXUS — Cart & Checkout (cart.js)
   ========================================================= */
(function () {
  'use strict';
  const S = window.NexusStore, UI = window.NexusUI;
  const $ = (s) => document.querySelector(s);

  /* page-local styles are in styles.css (cart section) */

  let receipt = null; // { name, type, size, dataUrl }

  /* ---------- render items ---------- */
  function render() {
    const wrap = $('#cartItems');
    const cart = S.getCart();
    const products = cart.map((x) => ({ x, p: S.getProduct(x.id) })).filter((r) => r.p);

    $('#cartLayout').style.display = products.length ? '' : 'none';

    if (!products.length) {
      let empty = document.getElementById('cartEmpty');
      if (!empty) {
        empty = document.createElement('div');
        empty.id = 'cartEmpty';
        empty.className = 'empty-state';
        empty.innerHTML = `
          <div class="es-ico">${UI.icon('cart', 30)}</div>
          <h3>سبد خرید شما خالی است</h3>
          <p>از فروشگاه، محصولات مورد نظرتان را انتخاب کنید.</p>
          <a href="index.html#store" class="btn btn-primary" style="margin-top:18px">رفتن به فروشگاه</a>`;
        wrap.parentElement.append(empty);
      }
      empty.style.display = '';
    } else {
      const e = document.getElementById('cartEmpty');
      if (e) e.style.display = 'none';
    }

    wrap.innerHTML = '';
    products.forEach(({ x, p }) => {
      const el = document.createElement('div');
      el.className = 'cart-item';
      el.innerHTML = `
        <img class="ci-img" src="${p.image}" alt="${S.esc(p.name_fa || p.name)}">
        <div class="ci-info">
          <div class="ci-cat">${S.esc(p.category_fa || '')}</div>
          <div class="ci-name">${S.esc(p.name_fa || p.name)} <span class="ci-en">${S.esc(p.name || '')}</span></div>
          <div class="ci-price">
            ${p.oldPrice ? `<span class="price-old">${S.toman(p.oldPrice)}</span>` : ''}
            <span class="price">${S.toman(p.price)}</span>
          </div>
        </div>
        <div class="ci-controls">
          <div class="qty">
            <button data-step="-1" aria-label="کاهش">−</button>
            <span>${S.faNum(x.qty)}</span>
            <button data-step="1" aria-label="افزایش">+</button>
          </div>
          <div class="ci-line">${S.toman(p.price * x.qty)}</div>
          <button class="ci-del" title="حذف از سبد" aria-label="حذف">${UI.icon('trash', 17)}</button>
        </div>`;
      el.querySelector('[data-step="-1"]').onclick = () => { S.setQty(p.id, x.qty - 1); render(); };
      el.querySelector('[data-step="1"]').onclick = () => {
        if (x.qty >= (p.stock || 99)) { UI.toast('بیش از موجودی انبار امکان‌پذیر نیست', 'err'); return; }
        S.setQty(p.id, x.qty + 1); render();
      };
      el.querySelector('.ci-del').onclick = () => { S.removeFromCart(p.id); render(); UI.toast('محصول از سبد حذف شد'); };
      wrap.append(el);
    });

    /* summary */
    const count = products.reduce((s, r) => s + r.x.qty, 0);
    const total = products.reduce((s, r) => s + r.p.price * r.x.qty, 0);
    $('#sumCount').textContent = S.faNum(count);
    $('#sumTotal').textContent = S.toman(total);
    $('#sumGrand').textContent = S.toman(total);
  }

  /* ---------- receipt upload ---------- */
  function fmtSize(bytes) {
    if (bytes > 1024 * 1024) return S.faNum((bytes / 1024 / 1024).toFixed(1)) + ' مگابایت';
    return S.faNum(Math.round(bytes / 1024)) + ' کیلوبایت';
  }

  function setReceipt(file, dataUrl) {
    receipt = { name: file.name, type: file.type, size: file.size, dataUrl };
    $('#rpImg').src = dataUrl;
    $('#rpName').textContent = file.name;
    $('#rpSize').textContent = fmtSize(file.size);
    $('#receiptPreview').classList.add('show');
  }

  function clearReceipt() {
    receipt = null;
    $('#receiptInput').value = '';
    $('#receiptPreview').classList.remove('show');
  }

  function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { UI.toast('فقط تصویر (JPG یا PNG) پذیرفته می‌شود', 'err'); return; }
    if (file.size > 5 * 1024 * 1024) { UI.toast('حجم فایل باید کمتر از ۵ مگابایت باشد', 'err'); return; }
    const r = new FileReader();
    r.onload = () => setReceipt(file, r.result);
    r.readAsDataURL(file);
  }

  function initUpload() {
    const drop = $('#receiptDrop');
    const input = $('#receiptInput');
    $('#fdIco').innerHTML = UI.icon('upload', 20);
    $('#rpX').innerHTML = '×';

    drop.addEventListener('click', () => input.click());
    drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') input.click(); });
    input.addEventListener('change', () => handleFile(input.files[0]));
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('drag'); }));
    drop.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));
    $('#rpX').addEventListener('click', clearReceipt);
  }

  /* ---------- validation ---------- */
  function digits(s) { return S.digitsToEn(String(s || '')).replace(/\D/g, ''); }

  function validate(c) {
    if (!c.fullname || c.fullname.trim().length < 3) return 'نام و نام خانوادگی را کامل وارد کنید.';
    const ph = digits(c.phone);
    if (!/^09\d{9}$/.test(ph)) return 'شماره موبایل معتبر نیست (مثال: 09123456789).';
    if (!c.city || c.city.trim().length < 2) return 'نام شهر را وارد کنید.';
    const po = digits(c.postal);
    if (!/^\d{10}$/.test(po)) return 'کد پستی باید ۱۰ رقم باشد.';
    if (!c.address || c.address.trim().length < 10) return 'آدرس کامل پستی را وارد کنید.';
    if (!receipt) return 'تصویر فیش واریزی را بارگذاری کنید.';
    return null;
  }

  /* ---------- submit ---------- */
  function submit(e) {
    e.preventDefault();
    const f = e.target;
    const c = {
      fullname: f.fullname.value.trim(),
      phone: digits(f.phone.value),
      city: f.city.value.trim(),
      postal: digits(f.postal.value),
      address: f.address.value.trim(),
    };
    const note = f.note.value.trim();

    const err = validate(c);
    if (err) { UI.toast(err, 'err'); return; }

    const cart = S.getCart().map((x) => ({ ...x }));
    const total = S.cartTotal();
    if (!cart.length) { UI.toast('سبد خرید خالی است.', 'err'); return; }

    const order = S.createOrder({ items: cart, total, customer: c, note, receipt });
    S.clearCart();
    clearReceipt();
    f.reset();

    /* cloud sync — the order (with receipt) travels to the admin panel */
    if (S.pushOrders) {
      S.pushOrders().then(() => {
        const tag = $('#cloudTag');
        if (tag) tag.hidden = false;
      }).catch(() => {});
    }

    $('#pgOrderNo').textContent = order.code;
    $('#sCode').textContent = order.code;
    const ov = $('#successOverlay');
    ov.classList.add('show');
  }

  /* ---------- boot ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    $('#sIco').innerHTML = UI.icon('check', 34);
    $('#pgHead').innerHTML = UI.icon('receipt', 16) + ' واریز به کارت زیر:';
    initUpload();
    render();

    $('#checkoutForm').addEventListener('submit', submit);
    $('#sClose').addEventListener('click', () => {
      $('#successOverlay').classList.remove('show');
      render();
    });
    $('#successOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'successOverlay') { $('#successOverlay').classList.remove('show'); render(); }
    });
  });
})();
