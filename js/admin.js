/* =========================================================
   NEXUS — Admin Panel (admin.js)
   Orders management + Product CRUD
   ========================================================= */
(function () {
  'use strict';
  const S = window.NexusStore, UI = window.NexusUI;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  /* ---------- icons ---------- */
  $('#tabOrdersIco').innerHTML = UI.icon('box', 15);
  $('#tabProductsIco').innerHTML = UI.icon('tag', 15);
  $('#tabChatsIco').innerHTML = UI.icon('headset', 15);
  $('#tabSettingsIco').innerHTML = UI.icon('shield', 15);
  $('#logoutIco').innerHTML = UI.icon('x', 15);
  $('#npIco').innerHTML = UI.icon('plus', 16);
  $('#pfIco').innerHTML = UI.icon('upload', 20);
  $('#pfClose').innerHTML = UI.icon('x', 16);
  $('#omClose').innerHTML = UI.icon('x', 16);
  $('#pfX').textContent = '×';
  $('#lockIco').innerHTML = UI.icon('shield', 30);
  $('#tvEmptyIco').innerHTML = UI.icon('headset', 30);

  /* =========================================================
     ADMIN AUTH (lock screen)
     ========================================================= */
  function applyLockState() {
    const unlocked = S.isUnlocked();
    $('#lockOverlay').hidden = unlocked;
    $('#adminMain').hidden = !unlocked;
    if (unlocked) { renderOrders(); renderProducts(); renderThreads(); startCloudSync(); }
  }

  $('#lockForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const pass = $('#lockPass').value;
    if (S.checkPass(pass)) {
      S.unlock();
      $('#lockError').hidden = true;
      $('#lockPass').value = '';
      applyLockState();
      UI.toast('خوش آمدید!');
    } else {
      $('#lockError').hidden = false;
    }
  });

  $('#logoutBtn').addEventListener('click', () => {
    S.lock();
    applyLockState();
  });

  /* change password */
  $('#passForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    if (!S.checkPass(f.current.value)) { UI.toast('رمز فعلی اشتباه است', 'err'); return; }
    if (f.next.value.length < 6) { UI.toast('رمز جدید باید حداقل ۶ کاراکتر باشد', 'err'); return; }
    if (f.next.value !== f.confirm.value) { UI.toast('تکرار رمز مطابقت ندارد', 'err'); return; }
    S.setPass(f.next.value);
    f.reset();
    UI.toast('رمز عبور با موفقیت تغییر کرد');
  });

  /* =========================================================
     TABS
     ========================================================= */
  $$('.admin-tab').forEach((btn) => {
    if (!btn.dataset.tab) return; /* logout has no tab */
    btn.addEventListener('click', () => {
      $$('.admin-tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      $$('.tab-panel').forEach((p) => (p.hidden = true));
      $('#tab-' + btn.dataset.tab).hidden = false;
      if (btn.dataset.tab === 'chats') renderThreads();
    });
  });

  /* =========================================================
     ORDERS
     ========================================================= */
  let orderFilter = 'all';

  function statusPill(s) {
    const info = S.statusInfo(s);
    return `<span class="st-pill" style="color:${info.dot};background:${info.bg}">
      <i class="st-dot" style="background:${info.dot}"></i>${info.label}</span>`;
  }

  function renderStats() {
    const orders = S.getOrders();
    const products = S.getProducts();
    const revenue = orders.filter((o) => o.status !== 'rejected')
      .reduce((s, o) => s + (o.total || 0), 0);
    $('#adminStats').innerHTML = `
      <div class="stat"><b>${S.faNum(orders.length)}</b><span>سفارش</span></div>
      <div class="stat"><b>${S.faNum(orders.filter((o) => o.status === 'pending').length)}</b><span>در انتظار</span></div>
      <div class="stat"><b>${S.faNum(products.length)}</b><span>محصول</span></div>
      <div class="stat"><b style="font-size:14px">${S.toman(revenue)}</b><span>مجموع فروش</span></div>`;
    $('#ordersCount').textContent = S.faNum(orders.length);
    $('#productsCount').textContent = S.faNum(products.length);
    const unread = S.adminUnreadCount();
    const cc = $('#chatsCount');
    cc.textContent = S.faNum(unread);
    cc.style.display = unread > 0 ? 'grid' : 'none';
  }

  function renderOrders() {
    renderStats();
    const wrap = $('#ordersList');
    const orders = S.getOrders().filter((o) => orderFilter === 'all' || o.status === orderFilter);

    if (!orders.length) {
      wrap.innerHTML = `
        <div class="empty-state">
          <div class="es-ico">${UI.icon('box', 30)}</div>
          <h3>سفارشی در این وضعیت نیست</h3>
          <p>سفارش‌های کاربران پس از ثبت در سبد خرید، اینجا نمایش داده می‌شوند.</p>
        </div>`;
      return;
    }

    wrap.innerHTML = '';
    orders.forEach((o) => {
      const el = document.createElement('div');
      el.className = 'order-card';
      const itemsCount = o.items.reduce((s, x) => s + x.qty, 0);
      const firstItem = S.getProduct(o.items[0].id);
      el.innerHTML = `
        <div class="oc-main">
          <img class="oc-img" src="${firstItem ? firstItem.image : ''}" alt="">
          <div class="oc-info">
            <div class="oc-top">
              <b class="oc-code" dir="ltr">${S.esc(o.code)}</b>
              ${statusPill(o.status)}
            </div>
            <div class="oc-name">
              ${S.esc(o.customer.fullname)}
              <span class="oc-en">${S.faNum(itemsCount)} کالا · ${S.esc(o.customer.city)}</span>
            </div>
            <div class="oc-date">${S.faDateTime(o.createdAt)}</div>
          </div>
          <div class="oc-side">
            <div class="oc-total">${S.toman(o.total)}</div>
            <div class="oc-actions">
              <button class="btn btn-ghost btn-sm" data-view="${o.id}">جزئیات و فیش</button>
            </div>
          </div>
        </div>`;
      el.querySelector('[data-view]').addEventListener('click', () => openOrder(o.id));
      wrap.append(el);
    });
  }

  /* ---------- order detail modal ---------- */
  function openOrder(id) {
    const o = S.getOrders().find((x) => x.id === id);
    if (!o) return;
    const body = $('#orderModalBody');

    const items = o.items.map((x) => {
      const p = S.getProduct(x.id) || { name_fa: 'محصول حذف‌شده', image: '', price: 0 };
      return `
        <div class="om-item">
          <img src="${p.image}" alt="">
          <div class="omi-info">
            <b>${S.esc(p.name_fa || p.name || '')}</b>
            <span>${S.faNum(x.qty)} × ${S.toman(p.price)}</span>
          </div>
          <div class="omi-total">${S.toman(p.price * x.qty)}</div>
        </div>`;
    }).join('');

    body.innerHTML = `
      <div class="om-head">
        <div>
          <div class="eyebrow">Order</div>
          <h3 style="font-size:20px;font-weight:800;margin-top:6px" dir="ltr">${S.esc(o.code)}</h3>
          <div class="oc-date">${S.faDateTime(o.createdAt)}</div>
        </div>
        ${statusPill(o.status)}
      </div>

      <div class="om-grid">
        <div class="om-sec">
          <h4>${UI.icon('user', 15)} مشخصات گیرنده</h4>
          <div class="kv"><span>نام</span><b>${S.esc(o.customer.fullname)}</b></div>
          <div class="kv"><span>موبایل</span><b dir="ltr">${S.esc(o.customer.phone)}</b></div>
          <div class="kv"><span>شهر</span><b>${S.esc(o.customer.city)}</b></div>
          <div class="kv"><span>کد پستی</span><b dir="ltr">${S.esc(o.customer.postal)}</b></div>
          <div class="kv"><span>آدرس</span><b>${S.esc(o.customer.address)}</b></div>
          ${o.note ? `<div class="kv"><span>توضیحات</span><b>${S.esc(o.note)}</b></div>` : ''}
          <div class="om-call">
            <a class="btn btn-ghost btn-sm" href="tel:${S.esc(o.customer.phone)}">${UI.icon('phone', 14)} تماس با مشتری</a>
          </div>
        </div>
        <div class="om-sec">
          <h4>${UI.icon('receipt', 15)} فیش واریزی</h4>
          ${o.receipt ? `
            <a href="${o.receipt.dataUrl}" download="receipt-${S.esc(o.code)}.png" target="_blank" class="receipt-thumb" title="برای مشاهده در اندازه کامل کلیک کنید">
              <img src="${o.receipt.dataUrl}" alt="فیش واریزی">
              <span class="rt-zoom">${UI.icon('eye', 16)}</span>
            </a>
            <div class="kv"><span>نام فایل</span><b>${S.esc(o.receipt.name)}</b></div>
            <div class="kv"><span>حجم</span><b>${S.faNum((o.receipt.size / 1024).toFixed(0))} کیلوبایت</b></div>
          ` : `
            <div class="receipt-missing">${UI.icon('info', 18)} فیشی برای این سفارش بارگذاری نشده است.</div>
          `}
        </div>
      </div>

      <div class="om-sec">
        <h4>${UI.icon('box', 15)} اقلام سفارش</h4>
        ${items}
        <div class="om-total"><span>مبلغ کل سفارش</span><b>${S.toman(o.total)}</b></div>
      </div>

      <div class="om-status-row">
        <span class="om-status-label">تغییر وضعیت سفارش:</span>
        <div class="om-status-btns">
          <button class="btn btn-sm st-confirm" data-st="confirmed">تایید پرداخت</button>
          <button class="btn btn-sm st-ship" data-st="shipped">ارسال شد</button>
          <button class="btn btn-sm st-deliv" data-st="delivered">تحویل شد</button>
          <button class="btn btn-sm st-reject" data-st="rejected">رد سفارش</button>
          <button class="btn btn-sm st-del" data-del="1">حذف سفارش</button>
        </div>
      </div>`;

    body.querySelector('[data-del]').addEventListener('click', () => {
      if (confirm(`سفارش ${o.code} برای همیشه حذف شود؟`)) {
        S.deleteOrder(o.id);
        UI.toast('سفارش حذف شد');
        $('#orderModal').classList.remove('open');
        renderOrders();
      }
    });

    $$('#orderModalBody [data-st]').forEach((b) => {
      b.addEventListener('click', () => {
        S.setOrderStatus(o.id, b.dataset.st);
        UI.toast('وضعیت سفارش به‌روزرسانی شد');
        renderOrders();
        openOrder(o.id); // refresh modal
      });
    });

    $('#orderModal').classList.add('open');
  }

  $('#orderModal').addEventListener('click', (e) => {
    if (e.target.id === 'orderModal' || e.target.closest('[data-close]')) {
      $('#orderModal').classList.remove('open');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $('#orderModal').classList.remove('open');
  });

  $$('#orderFilters .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      $$('#orderFilters .chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      orderFilter = chip.dataset.f;
      renderOrders();
    });
  });

  /* =========================================================
     PRODUCTS
     ========================================================= */
  let editingId = null;
  let pfImage = null; // dataUrl

  function renderProducts() {
    const wrap = $('#adminProducts');
    const list = S.getProducts();
    wrap.innerHTML = '';
    list.forEach((p) => {
      const el = document.createElement('div');
      el.className = 'ap-card';
      el.innerHTML = `
        <img class="ap-img" src="${p.image}" alt="">
        <div class="ap-info">
          <b>${S.esc(p.name_fa || p.name)}</b>
          <span class="ap-en">${S.esc(p.name || '')}</span>
          <span class="ap-meta">${S.esc(p.category_fa || '')} · موجودی: ${S.faNum(p.stock || 0)}</span>
          <span class="ap-price">${S.toman(p.price)}</span>
        </div>
        <div class="ap-actions">
          <button class="icon-btn" data-edit="${p.id}" title="ویرایش">${UI.icon('eye', 17)}</button>
          <button class="icon-btn" data-del="${p.id}" title="حذف">${UI.icon('trash', 17)}</button>
        </div>`;
      el.querySelector('[data-edit]').addEventListener('click', () => openProductForm(p.id));
      el.querySelector('[data-del]').addEventListener('click', () => {
        if (confirm(`محصول «${p.name_fa || p.name}» حذف شود؟`)) {
          S.deleteProduct(p.id);
          UI.toast('محصول حذف شد');
          renderProducts();
        }
      });
      wrap.append(el);
    });
    renderStats();
  }

  /* ---------- product form ---------- */
  function openProductForm(id) {
    editingId = id || null;
    const f = $('#productForm');
    f.reset();
    pfImage = null;
    $('#pfPreview').classList.remove('show');

    if (id) {
      const p = S.getProduct(id);
      $('#pfTitle').textContent = 'ویرایش محصول';
      $('#pfSubmit').textContent = 'ذخیره تغییرات';
      f.name_fa.value = p.name_fa || '';
      f.name.value = p.name || '';
      f.category.value = p.category || 'laptop';
      f.badge.value = p.badge || '';
      f.price.value = p.price || '';
      f.oldPrice.value = p.oldPrice || '';
      f.stock.value = p.stock || '';
      f.rating.value = p.rating || '';
      f.desc.value = p.desc || '';
      f.highlights.value = (p.highlights || []).join('\n');
      f.specs.value = (p.specs || []).map((sp) => `${sp.label} : ${sp.value}`).join('\n');
      if (p.image && !p.image.startsWith('data:image/svg')) {
        pfImage = p.image;
        $('#pfImg').src = p.image;
        $('#pfName').textContent = 'تصویر فعلی محصول';
        $('#pfSize').textContent = '';
        $('#pfPreview').classList.add('show');
      }
    } else {
      $('#pfTitle').textContent = 'افزودن محصول جدید';
      $('#pfSubmit').textContent = 'ذخیره محصول';
    }

    $('#productFormOverlay').classList.add('open');
  }

  function closeProductForm() {
    $('#productFormOverlay').classList.remove('open');
  }

  $('#newProductBtn').addEventListener('click', () => openProductForm(null));
  $('#productFormOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'productFormOverlay' || e.target.closest('[data-close]')) closeProductForm();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeProductForm();
  });

  /* image upload in product form */
  const drop = $('#pfDrop'), input = $('#pfInput');
  drop.addEventListener('click', () => input.click());
  drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') input.click(); });
  input.addEventListener('change', () => readImage(input.files[0]));
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('drag'); }));
  drop.addEventListener('drop', (e) => readImage(e.dataTransfer.files[0]));
  $('#pfX').addEventListener('click', () => { pfImage = null; input.value = ''; $('#pfPreview').classList.remove('show'); });

  function readImage(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { UI.toast('فقط فایل تصویری پذیرفته می‌شود', 'err'); return; }
    if (file.size > 4 * 1024 * 1024) { UI.toast('حجم تصویر باید کمتر از ۴ مگابایت باشد', 'err'); return; }
    const r = new FileReader();
    r.onload = () => {
      pfImage = r.result;
      $('#pfImg').src = pfImage;
      $('#pfName').textContent = file.name;
      $('#pfSize').textContent = S.faNum((file.size / 1024).toFixed(0)) + ' کیلوبایت';
      $('#pfPreview').classList.add('show');
    };
    r.readAsDataURL(file);
  }

  /* submit product */
  $('#productForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const price = parseInt(S.digitsToEn(f.price.value).replace(/\D/g, ''), 10);
    if (!f.name_fa.value.trim()) { UI.toast('نام فارسی محصول الزامی است', 'err'); return; }
    if (!price) { UI.toast('قیمت معتبر وارد کنید', 'err'); return; }
    if (!f.desc.value.trim()) { UI.toast('توضیحات محصول الزامی است', 'err'); return; }
    if (!pfImage) { UI.toast('تصویر محصول را بارگذاری کنید', 'err'); return; }

    const highlights = f.highlights.value.split('\n').map((s) => s.trim()).filter(Boolean);
    const specs = f.specs.value.split('\n').map((line) => {
      const i = line.indexOf(':');
      if (i < 0) return null;
      const label = line.slice(0, i).trim();
      const value = line.slice(i + 1).trim();
      if (!label || !value) return null;
      return { icon: 'cpu', label, value };
    }).filter(Boolean);

    const catFa = { laptop: 'لپ‌تاپ', pc: 'کامپیوتر رومیزی', acc: 'لوازم جانبی' }[f.category.value];

    const product = {
      id: editingId || S.uid('p'),
      name: f.name.value.trim() || f.name_fa.value.trim(),
      name_fa: f.name_fa.value.trim(),
      category: f.category.value,
      category_fa: catFa,
      price,
      oldPrice: parseInt(S.digitsToEn(f.oldPrice.value).replace(/\D/g, ''), 10) || 0,
      stock: parseInt(S.digitsToEn(f.stock.value).replace(/\D/g, ''), 10) || 0,
      badge: f.badge.value.trim(),
      rating: Math.min(5, parseFloat(S.digitsToEn(f.rating.value)) || 4.5),
      sold: editingId ? (S.getProduct(editingId).sold || 0) : 0,
      desc: f.desc.value.trim(),
      highlights,
      specs,
      image: pfImage,
      gallery: [],
      createdAt: Date.now(),
    };

    S.upsertProduct(product);
    UI.toast(editingId ? 'تغییرات ذخیره شد' : 'محصول جدید اضافه شد');
    closeProductForm();
    renderProducts();
  });

  /* =========================================================
     SUPPORT CHATS
     ========================================================= */
  let activeThreadId = null;

  function threadTitle(t) {
    const first = t.messages.find((m) => m.from === 'user');
    if (first) return first.text.slice(0, 44) + (first.text.length > 44 ? '…' : '');
    return 'گفتگوی جدید';
  }

  function renderThreads() {
    renderStats();
    const wrap = $('#threadsList');
    const threads = S.getThreads();

    if (!threads.length) {
      wrap.innerHTML = `
        <div class="empty-state" style="padding:34px 12px">
          <div class="es-ico" style="width:52px;height:52px">${UI.icon('headset', 22)}</div>
          <h3 style="font-size:14px">پیامی نیست</h3>
          <p style="font-size:11.5px">هنوز گفتگری از سمت کاربران ثبت نشده است.</p>
        </div>`;
      return;
    }

    wrap.innerHTML = '';
    threads.forEach((t) => {
      const el = document.createElement('button');
      el.className = 'thread-item' + (t.id === activeThreadId ? ' active' : '');
      const last = t.messages[t.messages.length - 1];
      el.innerHTML = `
        <div class="ti-top">
          <b>${S.esc(threadTitle(t))}</b>
          ${t.unreadForAdmin ? `<span class="ti-unread">${S.faNum(t.unreadForAdmin)}</span>` : ''}
        </div>
        <span class="ti-last">${last ? S.esc((last.from === 'admin' ? 'شما: ' : '') + last.text).slice(0, 60) : ''}</span>
        <span class="ti-date">${S.faDateTime(t.updatedAt)}</span>`;
      el.addEventListener('click', () => openThread(t.id));
      wrap.append(el);
    });
  }

  function openThread(id) {
    activeThreadId = id;
    S.markRead(id, 'admin');
    renderThreads();

    const t = S.getThread(id);
    const view = $('#threadView');
    if (!t) { view.innerHTML = ''; return; }

    view.innerHTML = `
      <div class="tv-head">
        <div>
          <div class="eyebrow">Support Chat</div>
          <b class="tv-title">گفتگو با کاربر</b>
        </div>
        <button class="btn btn-danger btn-sm" id="tvDelete">حذف گفتگو</button>
      </div>
      <div class="tv-msgs" id="tvMsgs">
        ${t.messages.map((m) => `
          <div class="chat-msg ${m.from === 'admin' ? 'me' : 'admin'}">
            <div class="cm-bubble">${S.esc(m.text)}</div>
            <div class="cm-time">${S.faDateTime(m.at)}</div>
          </div>`).join('')}
      </div>
      <form class="chat-input tv-input" id="tvForm">
        <input type="text" id="tvInput" placeholder="پاسخ خود را بنویسید…" maxlength="1000" autocomplete="off">
        <button type="submit" aria-label="ارسال">${UI.icon('arrowL', 18)}</button>
      </form>`;

    view.querySelector('#tvMsgs').scrollTop = view.scrollHeight;
    view.querySelector('#tvDelete').addEventListener('click', () => {
      if (confirm('این گفتگو برای همیشه حذف شود؟')) {
        S.deleteThread(id);
        if (S.removeSlotFromIndex) S.removeSlotFromIndex(id);
        activeThreadId = null;
        $('#threadView').innerHTML = `
          <div class="empty-state">
            <div class="es-ico">${UI.icon('headset', 30)}</div>
            <h3>یک گفتگو را انتخاب کنید</h3>
            <p>پیام‌های ارسالی کاربران از ویجت پشتیبانی اینجا نمایش داده می‌شود.</p>
          </div>`;
        renderThreads();
      }
    });

    view.querySelector('#tvForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const inp = view.querySelector('#tvInput');
      const text = inp.value.trim();
      if (!text) return;
      S.replyToThread(id, text);
      inp.value = '';
      /* deliver the reply straight to the visitor's cloud slot */
      if (S.pushReplyToSlot) S.pushReplyToSlot(id).catch(() => {});
      openThread(id); /* re-render */
    });
  }

  /* live sync — new user messages appear while admin is watching */
  window.addEventListener('storage', (e) => {
    if (e.key === 'nexus.chat.v1' && S.isUnlocked()) {
      renderThreads();
      if (activeThreadId) openThread(activeThreadId);
    }
  });

  /* =========================================================
     CLOUD SYNC (textdb.dev)
     Pulls every visitor slot from the public index and merges
     its orders + chats into the panel. Runs on unlock, every
     60s and after every admin action. All visitors' data —
     regardless of device or port — lands here.
     ========================================================= */
  let syncTimer = null;

  function setSyncStatus(text, cls) {
    const el = $('#syncStatus');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'sync-status' + (cls ? ' ' + cls : '');
  }

  async function doSync(silent) {
    if (!S.adminSync) return;
    if (!silent) setSyncStatus('⇅ در حال همگام‌سازی…', 'busy');
    try {
      const res = await S.adminSync();
      renderOrders(); renderThreads();
      const parts = [];
      if (res.orders) parts.push(S.faNum(res.orders) + ' سفارش جدید');
      if (res.chats) parts.push(S.faNum(res.chats) + ' گفتگوی جدید');
      if (res.failed) parts.push(S.faNum(res.failed) + ' اسلات در دسترس نبود');
      setSyncStatus(
        '☁️ متصل — ' + S.faNum(res.slots) + ' کاربر متصل' + (parts.length ? ' · ' + parts.join(' · ') : ' · همه‌چیز به‌روز است'),
        res.failed ? 'warn' : 'ok'
      );
    } catch (e) {
      setSyncStatus('⚠️ اتصال به سرور ابری برقرار نشد — داده‌های محلی نمایش داده می‌شود', 'warn');
    }
  }

  function startCloudSync() {
    if (syncTimer) return;
    doSync(false);
    syncTimer = setInterval(() => doSync(true), 60000);
  }

  /* every admin action re-publishes replies + refreshes views */
  const _setOrderStatus = S.setOrderStatus;
  S.setOrderStatus = function (id, st) {
    _setOrderStatus(id, st);
    doSync(true);
  };
  const _deleteOrder = S.deleteOrder;
  S.deleteOrder = function (id) {
    _deleteOrder(id);
    doSync(true);
  };

  /* =========================================================
     BOOT
     ========================================================= */
  applyLockState();
})();
