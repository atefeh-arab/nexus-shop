/* =========================================================
   NEXUS STORE — Data Layer (store.js)
   Products / Cart / Orders with receipt upload / Admin
   ========================================================= */
(function () {
  'use strict';

  const LS = {
    CART: 'nexus.cart.v1',
    ORDERS: 'nexus.orders.v1',
    PRODUCTS: 'nexus.products.v1',
    CHAT: 'nexus.chat.v1',
    ADMIN: 'nexus.admin.v1',
    SLOT: 'nexus.slot.v1',
  };

  /* =========================================================
     CLOUD SYNC (textdb.dev)
     ------------------------------------------------------------
     Every visitor with no slot yet gets a private slot id like
     "nxo-4f9c2b18". Orders and support chats are POSTed there
     and the admin panel can read ANY slot by its id, so data
     from all visitors/ports shows up in one admin panel.
     No login, no signup — the slot id is the address.
     ========================================================= */
  const CLOUD = 'https://textdb.dev/api/data/';
  const INDEX_KEY = 'nexus-store-idx-9f3a7c';       /* public slot index */
  const ADMIN_REG = 'nexus-store-admin-c1a2e3';     /* admin registry */
  const MAX_SLOT_BYTES = 450 * 1024;                /* textdb.dev per-slot cap */

  function getSlot() {
    let s = load(LS.SLOT, null);
    if (!s || typeof s !== 'string' || !s.startsWith('nxo-')) {
      s = 'nxo-' + Math.random().toString(16).slice(2, 10);
      save(LS.SLOT, s);
    }
    return s;
  }
  function setSlot(v) { save(LS.SLOT, v); }

  async function cloudRead(key) {
    const r = await fetch(CLOUD + key, { cache: 'no-store' });
    if (!r.ok) throw new Error('cloud read ' + r.status);
    return r.text();
  }
  async function cloudWrite(key, str) {
    const body = String(str == null ? '' : str);
    if (body.length > MAX_SLOT_BYTES) throw new Error('TOO_LARGE:' + body.length);
    const r = await fetch(CLOUD + key, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body,
    });
    if (!r.ok) throw new Error('cloud write ' + r.status);
    return true;
  }

  function registerSlot(slot, label) {
    /* fire-and-forget: make this slot discoverable by the admin panel */
    cloudRead(INDEX_KEY).then((txt) => {
      const idx = txt ? JSON.parse(txt) : {};
      if (idx[slot] !== label) {
        idx[slot] = label || 'بازدیدکننده';
        cloudWrite(INDEX_KEY, JSON.stringify(idx)).catch(() => {});
      }
    }).catch(() => {});
  }

  async function cloudGetAllSlots() {
    /* admin: every registered slot + self-test slot  */
    let idx = {};
    try { idx = JSON.parse(await cloudRead(INDEX_KEY)) || {}; } catch (e) { idx = {}; }
    return idx;
  }

  /* shrink an image dataUrl so the receipt fits the cloud slot limit */
  function shrinkImage(dataUrl, maxKB) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const MAXW = 900;
        const scale = Math.min(1, MAXW / img.width);
        const cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(img.width * scale));
        cv.height = Math.max(1, Math.round(img.height * scale));
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        let q = 0.82;
        const step = () => {
          const out = cv.toDataURL('image/jpeg', q);
          if (out.length < (maxKB || 400) * 1024 || q <= 0.35) return out;
          q -= 0.12;
          return step();
        };
        resolve(step());
      };
      img.onerror = () => resolve(dataUrl); /* keep original on failure */
      img.src = dataUrl;
    });
  }

  /* the slot is single-valued: ALWAYS write the full state (orders + chat)
     in one go so a chat push never clobbers orders and vice versa */
  async function pushState() {
    const slot = getSlot();
    const payload = { slot, updatedAt: Date.now(), orders: getOrders(), chat: getThreads() };

    /* keep newest receipts; shrink if the payload would exceed the cap */
    const fit = async (p) => {
      const txt = JSON.stringify(p);
      if (txt.length <= MAX_SLOT_BYTES) return p;
      const clone = JSON.parse(JSON.stringify(p));
      /* 1) shrink the newest receipt, drop older ones */
      const withR = clone.orders.map((o) => o.receipt && o.receipt.dataUrl);
      let kept = 0;
      for (const o of clone.orders) {
        if (o.receipt && o.receipt.dataUrl) {
          kept++;
          if (kept > 2) o.receipt = null;
        }
      }
      if (JSON.stringify(clone).length <= MAX_SLOT_BYTES) return clone;
      /* 2) shrink newest receipt image */
      for (const o of clone.orders) {
        if (o.receipt && o.receipt.dataUrl && o.receipt.dataUrl.length > 60 * 1024) {
          o.receipt = Object.assign({}, o.receipt, { dataUrl: await shrinkImage(o.receipt.dataUrl, 300) });
          if (JSON.stringify(clone).length <= MAX_SLOT_BYTES) return clone;
        }
      }
      /* 3) trim oldest chats, then oldest receipt-less orders */
      while (clone.chat.length > 1 && JSON.stringify(clone).length > MAX_SLOT_BYTES) clone.chat.pop();
      return clone;
    };

    const safe = await fit(payload);
    await cloudWrite(slot, JSON.stringify(safe));
    registerSlot(slot, 'بازدیدکننده · ' + new Date().toISOString().slice(0, 10));
  }
  const pushOrders = pushState;
  const pushChat = pushState;

  async function pullSlot(slot) {
    const txt = await cloudRead(slot);
    return txt ? JSON.parse(txt) : null;
  }

  /* merge helpers (admin side) */
  function mergeOrders(cloudOrders) {
    const local = getOrders();
    let added = 0;
    (cloudOrders || []).forEach((o) => {
      if (!local.some((x) => x.id === o.id)) { local.push(o); added++; }
    });
    if (added) {
      local.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      saveOrders(local);
    }
    return added;
  }
  function mergeChat(cloudChat) {
    const local = getThreads();
    let changedCount = 0;
    (cloudChat || []).forEach((ct) => {
      const lt = local.find((x) => x.id === ct.id);
      if (!lt) {
        local.push(ct);
        changedCount++;
        return;
      }
      let changed = false;
      (ct.messages || []).forEach((m) => {
        const dup = lt.messages.some((x) => x.at === m.at && x.text === m.text && x.from === m.from);
        if (!dup) {
          lt.messages.push(m);
          changed = true;
          /* new incoming messages bump the right unread counter */
          if (m.from === 'user') lt.unreadForAdmin = (lt.unreadForAdmin || 0) + 1;
          else lt.unreadForUser = (lt.unreadForUser || 0) + 1;
        }
      });
      if (ct.updatedAt > lt.updatedAt) lt.updatedAt = ct.updatedAt;
      if (changed) {
        lt.messages.sort((a, b) => (a.at || 0) - (b.at || 0));
        changedCount++;
      }
    });
    if (changedCount) saveThreads(local);
    return changedCount;
  }

  /* admin: append a reply to a SPECIFIC thread (not to "my own" thread) */
  function replyToThread(threadId, text) {
    const threads = getThreads();
    const t = threads.find((x) => x.id === threadId);
    if (!t) return null;
    t.messages.push({ from: 'admin', text: String(text || '').slice(0, 1000), at: Date.now() });
    t.updatedAt = Date.now();
    t.unreadForUser = (t.unreadForUser || 0) + 1;
    threads.sort((a, b) => b.updatedAt - a.updatedAt);
    saveThreads(threads);
    return t;
  }

  /* admin → visitor: write the visitor's own thread back to their slot.
     Orders already in the payload are preserved untouched. */
  async function pushReplyToSlot(slotId) {
    const t = getThreads().find((x) => x.id === slotId);
    if (!t) return;
    let payload = {};
    try { payload = JSON.parse(await cloudRead(slotId)) || {}; } catch (e) { payload = {}; }
    payload.slot = slotId;
    payload.chat = [t];   /* a visitor slot holds exactly one thread */
    payload.updatedAt = Date.now();
    await cloudWrite(slotId, JSON.stringify(payload));
  }

  /* visitor side: merge whatever came from my own slot */
  function mergeChatRemote(cloudChat) { return mergeChat(cloudChat); }

  /* admin: drop a visitor slot from the public index (e.g. deleted chat) */
  function removeSlotFromIndex(slot) {
    cloudRead(INDEX_KEY).then((txt) => {
      const idx = txt ? JSON.parse(txt) : {};
      if (idx[slot] != null) {
        delete idx[slot];
        cloudWrite(INDEX_KEY, JSON.stringify(idx)).catch(() => {});
      }
    }).catch(() => {});
  }

  async function adminSync() {
    /* admin panel: pull every known slot and merge into local view */
    const idx = await cloudGetAllSlots();
    let orders = 0, chats = 0, failed = 0;
    await Promise.all(Object.keys(idx).map(async (slot) => {
      try {
        const data = await pullSlot(slot);
        if (!data) return;
        orders += mergeOrders(data.orders);
        chats += mergeChat(data.chat);
      } catch (e) { failed++; }
    }));
    return { slots: Object.keys(idx).length, orders, chats, failed };
  }

  /* ---------------- utils ---------------- */
  function faNum(n) { return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]); }

  function toman(n) {
    if (typeof n !== 'number' || !isFinite(n)) return '';
    return faNum(n.toLocaleString('en-US')).replace(/,/g, '٬') + ' تومان';
  }

  function digitsToEn(s) {
    return String(s)
      .replace(/[۰-۹]/g, (ch) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(ch)))
      .replace(/[٠-٩]/g, (ch) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(ch)));
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function load(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  }

  /* ---------------- images (SVG placeholders) ---------------- */
  const IMGS = {
    laptop: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 560">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0e1730"/><stop offset="1" stop-color="#05070d"/>
    </linearGradient>
    <linearGradient id="lid" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2b3140"/><stop offset="1" stop-color="#11141c"/>
    </linearGradient>
    <linearGradient id="scr" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#101c3c"/><stop offset=".55" stop-color="#0a1226"/><stop offset="1" stop-color="#060a14"/>
    </linearGradient>
    <linearGradient id="deck" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#23272f"/><stop offset="1" stop-color="#0d1015"/>
    </linearGradient>
  </defs>
  <rect width="800" height="560" fill="url(#bg)"/>
  <circle cx="640" cy="90" r="160" fill="rgba(124,196,255,.10)"/>
  <circle cx="640" cy="90" r="90" fill="rgba(124,196,255,.12)"/>
  <g transform="translate(90,90)">
    <rect x="6" y="6" width="608" height="380" rx="18" fill="url(#lid)" stroke="rgba(255,255,255,.08)"/>
    <rect x="26" y="26" width="568" height="340" rx="10" fill="url(#scr)"/>
    <rect x="26" y="26" width="568" height="340" rx="10" fill="none" stroke="rgba(124,196,255,.25)"/>
    <rect x="286" y="26" width="48" height="12" rx="3" fill="#000"/>
    <text x="310" y="150" text-anchor="middle" font-family="Anjoman,Tahoma" font-size="44" fill="#7cc4ff" font-weight="700">NEXUS</text>
    <text x="310" y="190" text-anchor="middle" font-family="Anjoman,Tahoma" font-size="20" fill="rgba(214,228,255,.75)">POWER · SILENCE · PRECISION</text>
    <rect x="90" y="230" width="200" height="10" rx="5" fill="rgba(124,196,255,.35)"/>
    <rect x="90" y="230" width="120" height="10" rx="5" fill="#7cc4ff"/>
    <rect x="90" y="255" width="200" height="10" rx="5" fill="rgba(124,196,255,.22)"/>
    <rect x="90" y="255" width="72" height="10" rx="5" fill="rgba(124,196,255,.8)"/>
    <rect x="90" y="280" width="200" height="10" rx="5" fill="rgba(124,196,255,.15)"/>
    <rect x="90" y="280" width="150" height="10" rx="5" fill="rgba(124,196,255,.55)"/>
  </g>
  <g transform="translate(96,486)">
    <rect x="0" y="0" width="600" height="22" rx="8" fill="url(#deck)"/>
    <rect x="60" y="3" width="480" height="16" rx="4" fill="#0c0f14"/>
  </g>
</svg>`)}`,
    laptopDark: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 560">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#101832"/><stop offset="1" stop-color="#04060b"/>
    </linearGradient>
    <linearGradient id="lid" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#32394a"/><stop offset="1" stop-color="#141821"/>
    </linearGradient>
    <linearGradient id="scr" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0d1b3f"/><stop offset="1" stop-color="#05080f"/>
    </linearGradient>
  </defs>
  <rect width="800" height="560" fill="url(#bg)"/>
  <circle cx="150" cy="80" r="130" fill="rgba(244,176,106,.10)"/>
  <circle cx="660" cy="470" r="150" fill="rgba(124,196,255,.10)"/>
  <g transform="translate(70,110)">
    <rect x="10" y="10" width="640" height="330" rx="18" fill="url(#lid)" stroke="rgba(255,255,255,.10)"/>
    <rect x="30" y="30" width="600" height="290" rx="10" fill="url(#scr)"/>
    <rect x="276" y="30" width="48" height="11" rx="3" fill="#000"/>
    <text x="330" y="150" text-anchor="middle" font-family="Anjoman,Tahoma" font-size="42" fill="#f4b06a" font-weight="700">NEXUS</text>
    <text x="330" y="190" text-anchor="middle" font-family="Anjoman,Tahoma" font-size="20" fill="rgba(255,240,220,.75)">THIN · LIGHT · LIMITLESS</text>
    <rect x="100" y="230" width="220" height="9" rx="4.5" fill="rgba(244,176,106,.35)"/>
    <rect x="100" y="230" width="130" height="9" rx="4.5" fill="rgba(244,176,106,.9)"/>
    <rect x="100" y="252" width="220" height="9" rx="4.5" fill="rgba(244,176,106,.25)"/>
    <rect x="100" y="252" width="80" height="9" rx="4.5" fill="rgba(244,176,106,.8)"/>
  </g>
  <g transform="translate(76,452)">
    <rect x="0" y="0" width="640" height="22" rx="8" fill="#1a1e26"/>
    <rect x="70" y="3" width="500" height="16" rx="4" fill="#0b0e13"/>
  </g>
</svg>`)}`,
  };

  function svgCard(title, sub, tint) {
    const T = tint || { a: '#0e1730', b: '#05070d', c: '#7cc4ff' };
    return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 560">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${T.a}"/><stop offset="1" stop-color="${T.b}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="560" fill="url(#g)"/>
  <circle cx="650" cy="80" r="150" fill="${T.c}14"/>
  <circle cx="120" cy="480" r="120" fill="${T.c}0e"/>
  <text x="400" y="245" text-anchor="middle" font-family="Anjoman,Tahoma" font-size="40" font-weight="700" fill="${T.c}">${esc(title)}</text>
  <text x="400" y="300" text-anchor="middle" font-family="Anjoman,Tahoma" font-size="19" fill="rgba(230,238,255,.65)">${esc(sub)}</text>
  <rect x="280" y="340" width="240" height="2" fill="${T.c}55"/>
</svg>`)}`;
  }

  function productImage(p) {
    if (p && typeof p.image === 'string' && p.image.trim() && p.image.trim() !== '#') return p.image.trim();
    return svgCard((p && (p.name_fa || p.name)) || 'محصول', (p && p.category_fa) || 'NEXUS', null);
  }

  /* ---------------- catalog seed ---------------- */
  const SEED = [
    {
      id: 'p1',
      name: 'Nexus Pro 16',
      name_fa: 'لپ‌تاپ نکسوس پرو ۱۶',
      category: 'laptop',
      category_fa: 'لپ‌تاپ',
      price: 89000000,
      oldPrice: 96500000,
      stock: 7,
      badge: 'پرفروش‌ترین',
      specs: [
        { icon: 'cpu', label: 'پردازنده', value: 'Intel Core i9-14900HX · ۲۴ هسته' },
        { icon: 'gpu', label: 'گرافیک', value: 'NVIDIA RTX 5080 · 16GB GDDR7' },
        { icon: 'ram', label: 'حافظه رم', value: '۳۲ گیگابایت DDR5-7200' },
        { icon: 'ssd', label: 'حافظه ذخیره‌سازی', value: '۲ ترابایت NVMe Gen5' },
        { icon: 'disp', label: 'نمایشگر', value: '۱۶ اینچ Mini-LED · 240Hz · 2.5K' },
        { icon: 'bat', label: 'باتری', value: '۹۹ وات‌ساعت · شارژ سریع ۱۴۰ وات' },
      ],
      desc: 'پرچم‌دار سری Pro با بدنه‌ی یکپارچه‌ی منیزیم، سیستم خنک‌کننده‌ی بخارمحفظه و نمایشگر کالیبره‌شده از کارخانه. برای رندر، مدل‌سازی سه‌بعدی و بازی‌های سنگین ساخته شده است؛ در حالی که در حالت سکوت، صدای آن از پس‌زمینه‌ی موسیقی آرام هم کمتر است.',
      highlights: ['بدنه منیزیم یکپارچه با ضخامت ۱۹ میلی‌متر', 'سیستم خنک‌کننده بخارمحفظه (Vapor Chamber)', 'نمایشگر کالیبره‌شده · پوشش ۱۰۰٪ DCI-P3'],
      image: IMGS.laptop,
      gallery: [],
      rating: 4.9, sold: 128,
      createdAt: 1726700000000,
    },
    {
      id: 'p2',
      name: 'Nexus Air 14',
      name_fa: 'لپ‌تاپ نکسوس ایر ۱۴',
      category: 'laptop',
      category_fa: 'لپ‌تاپ',
      price: 52400000,
      oldPrice: 0,
      stock: 12,
      badge: 'جدید',
      specs: [
        { icon: 'cpu', label: 'پردازنده', value: 'Intel Core Ultra 7 · 16 هسته' },
        { icon: 'gpu', label: 'گرافیک', value: 'Arc Graphics · یکپارچه' },
        { icon: 'ram', label: 'حافظه رم', value: '۳۲ گیگابایت LPDDR5X' },
        { icon: 'ssd', label: 'حافظه ذخیره‌سازی', value: '۱ ترابایت NVMe Gen4' },
        { icon: 'disp', label: 'نمایشگر', value: '۱۴ اینچ OLED · 120Hz · 2.8K' },
        { icon: 'bat', label: 'باتری', value: '۷۲ وات‌ساعت · تا ۱۸ ساعت شارژدهی' },
      ],
      desc: 'سبک‌ترین عضو خانواده با وزن ۱٫۱۹ کیلوگرم و ضخامت ۱۴٫۹ میلی‌متر. نمایشگر OLED با نرخ نوسازی تطبیقی و پردازنده Core Ultra با موتور NPU برای هوش مصنوعی روی دستگاه. همراه مناسب طراحان، نویسندگان و دانشجویان.',
      highlights: ['وزن ۱٫۱۹ کیلوگرم · ضخامت ۱۴٫۹ میلی‌متر', 'نمایشگر OLED 2.8K با ۱۲۰ هرتز', 'موتور NPU برای پردازش هوش مصنوعی'],
      image: 'img/nexus-air-desk.jpg',
      gallery: [],
      rating: 4.8, sold: 203,
      createdAt: 1726700000000 + 1,
    },
    {
      id: 'p3',
      name: 'Nexus Tower X',
      name_fa: 'کامپیوتر رومیزی نکسوس تاور ایکس',
      category: 'pc',
      category_fa: 'کامپیوتر رومیزی',
      price: 145000000,
      oldPrice: 158000000,
      stock: 3,
      badge: '',
      specs: [
        { icon: 'cpu', label: 'پردازنده', value: 'AMD Ryzen Threadripper 7970X · 32 هسته' },
        { icon: 'gpu', label: 'گرافیک', value: 'NVIDIA RTX 6000 Ada · 48GB' },
        { icon: 'ram', label: 'حافظه رم', value: '۱۲۸ گیگابایت DDR5 ECC' },
        { icon: 'ssd', label: 'حافظه ذخیره‌سازی', value: '۴ ترابایت NVMe Gen5 + 8TB HDD' },
        { icon: 'case', label: 'قاب', value: 'قاب آلومینیومی · پنل شیشه مات' },
        { icon: 'bat', label: 'منبع تغذیه', value: '۱۳۰۰ وات · گواهی 80Plus Titanium' },
      ],
      desc: 'ایستگاه کاری حرفه‌ای برای استودیوهای رندر و مهندسی. خنک‌کننده آبی سفارشی، ۳۲ رشته پردازش هم‌زمان و ۴۸ گیگابایت حافظه‌ی گرافیکی حرفه‌ای. هر دستگاه قبل از ارسال ۴۸ ساعت تست استرس می‌شود.',
      highlights: ['۳۲ هسته برای رندر و شبیه‌سازی', 'خنک‌کننده آبی سفارشی با سطح صدای زیر ۲۸ دسی‌بل', '۴۸ ساعت تست استرس پیش از ارسال'],
      image: svgCard('Nexus Tower X', 'ایستگاه کاری ۳۲ هسته‌ای', { a: '#1a1230', b: '#070510', c: '#b48cff' }),
      gallery: [],
      rating: 5.0, sold: 41,
      createdAt: 1726700000000 + 2,
    },
    {
      id: 'p4',
      name: 'Nexus Display 6K',
      name_fa: 'نمایشگر نکسوس 6K',
      category: 'acc',
      category_fa: 'لوازم جانبی',
      price: 38500000,
      oldPrice: 0,
      stock: 9,
      badge: '',
      specs: [
        { icon: 'disp', label: 'پنل', value: '۳۲ اینچ IPS Black · 6K' },
        { icon: 'gpu', label: 'نرخ نوسازی', value: '۶۰ هرتز · HDR1400' },
        { icon: 'ram', label: 'پوشش رنگی', value: '۱۰۰٪ DCI-P3 · ΔE < 1' },
        { icon: 'ssd', label: 'پورت‌ها', value: 'Thunderbolt 5 · HDMI 2.1 · USB-C 140W' },
        { icon: 'case', label: 'پایه', value: 'ارتفاع قابل‌تنظیم · چرخش عمودی' },
        { icon: 'cpu', label: 'کالیبراسیون', value: 'گواهی کالیبره کارخانه‌ای' },
      ],
      desc: 'نمایشگر مرجع برای ویرایش رنگ و تدوین. پنل IPS Black با کنتراست دوبرابر پنل‌های معمولی، پوشش کامل DCI-P3 و خطای رنگ زیر ۱. هود ضدبازتاب مغناطیسی در جعبه موجود است.',
      highlights: ['کنتراست ۲۰۰۰:۱ در پنل IPS Black', 'کالیبره‌شده با گواهی ΔE<1', 'Thunderbolt 5 با شارژ ۱۴۰ وات'],
      image: svgCard('Nexus Display 6K', 'نمایشگر مرجع ۶K', { a: '#0a1a18', b: '#040807', c: '#4fe3c1' }),
      gallery: [],
      rating: 4.7, sold: 66,
      createdAt: 1726700000000 + 3,
    },
    {
      id: 'p5',
      name: 'Nexus Key',
      name_fa: 'کیبورد مکانیکی نکسوس',
      category: 'acc',
      category_fa: 'لوازم جانبی',
      price: 4900000,
      oldPrice: 5600000,
      stock: 25,
      badge: 'تخفیف‌دار',
      specs: [
        { icon: 'case', label: 'سوئیچ', value: 'نکسوس نارنجی · خطی · ۴۵gf' },
        { icon: 'ram', label: 'اتصال', value: '۲.۴ گیگاهرتز / بلوتوث ۵.۳ / USB-C' },
        { icon: 'bat', label: 'باتری', value: '۴۰۰۰ میلی‌آمپر · تا ۲۰۰ ساعت' },
        { icon: 'disp', label: 'بدنه', value: 'آلومینیوم CNC · گسکت نرم' },
        { icon: 'cpu', label: 'کیکپ', value: 'PBT دابل‌شات · پروفایل کم‌ارتفاع' },
        { icon: 'gpu', label: 'روشنایی', value: 'RGB جنوب‌رو · ۱۶٫۸ میلیون رنگ' },
      ],
      desc: 'کیبورد مکانیکی ۷۵٪ با بدنه‌ی آلومینیوم CNC و گسکت نرم برای تایپ خزه‌ای. سه حالت اتصال و باتری ۲۰۰ ساعته. کیکپ‌های PBT دابل‌شات رنگ ثابت دارند و روغن‌کاری سوئیچ‌ها در کارخانه انجام شده است.',
      highlights: ['گسکت مونت با تایپ خزه‌ای', 'باتری ۲۰۰ ساعته · سه حالت اتصال', 'بدنه آلومینیوم CNC یکپارچه'],
      image: svgCard('Nexus Key', 'کیبورد مکانیکی ۷۵٪', { a: '#221208', b: '#0c0603', c: '#f4b06a' }),
      gallery: [],
      rating: 4.6, sold: 512,
      createdAt: 1726700000000 + 4,
    },
    {
      id: 'p6',
      name: 'Nexus Pods',
      name_fa: 'هندزفری نکسوس پادز',
      category: 'acc',
      category_fa: 'لوازم جانبی',
      price: 6800000,
      oldPrice: 0,
      stock: 18,
      badge: '',
      specs: [
        { icon: 'case', label: 'درایور', value: '۱۱ میلی‌متری دوقطبی' },
        { icon: 'gpu', label: 'نویز کنسلینگ', value: 'ANC تطبیقی تا ۴۵dB' },
        { icon: 'ram', label: 'اتصال', value: 'بلوتوث ۵.۴ · مالتی‌پوینت' },
        { icon: 'bat', label: 'باتری', value: '۸ ساعت + ۳۲ ساعت با کیس' },
        { icon: 'ssd', label: 'کدک', value: 'LDAC · AAC · SBC' },
        { icon: 'disp', label: 'ضدآب', value: 'IPX5' },
      ],
      desc: 'هندزفری واقعاً بی‌سیم با ANC تطبیقی و صدای فضایی با ردیابی سر. مالتی‌پوینت برای اتصال هم‌زمان لپ‌تاپ و گوشی، و حالت شفافیت طبیعی برای گفتگو بدون برداشتن هندزفری.',
      highlights: ['ANC تطبیقی تا ۴۵dB', 'صدای فضایی با ردیابی سر', 'اتصال هم‌زمان دو دستگاه'],
      image: svgCard('Nexus Pods', 'ANC · صدای فضایی', { a: '#0d1a2e', b: '#05080f', c: '#7cc4ff' }),
      gallery: [],
      rating: 4.5, sold: 298,
      createdAt: 1726700000000 + 5,
    },
  ];

  /* ---------------- products API ---------------- */
  function getProducts() {
    return load(LS.PRODUCTS, null) || SEED.map((p) => Object.assign({}, p));
  }
  function saveProducts(list) { save(LS.PRODUCTS, list); }

  function resetProducts() {
    try { localStorage.removeItem(LS.PRODUCTS); } catch (e) {}
  }

  function getProduct(id) {
    return getProducts().find((p) => p.id === id) || null;
  }

  function upsertProduct(p) {
    const list = getProducts();
    const i = list.findIndex((x) => x.id === p.id);
    if (i >= 0) list[i] = p; else list.unshift(p);
    saveProducts(list);
    return p;
  }

  function deleteProduct(id) {
    saveProducts(getProducts().filter((p) => p.id !== id));
  }

  /* ---------------- cart API ---------------- */
  function getCart() { return load(LS.CART, []); }
  function saveCart(c) { save(LS.CART, c); updateCartBadge(); }

  function addToCart(id, qty) {
    const c = getCart();
    const item = c.find((x) => x.id === id);
    if (item) item.qty += qty || 1;
    else c.push({ id, qty: qty || 1 });
    saveCart(c);
  }

  function setQty(id, qty) {
    let c = getCart();
    if (qty <= 0) c = c.filter((x) => x.id !== id);
    else {
      const item = c.find((x) => x.id === id);
      if (item) item.qty = qty;
    }
    saveCart(c);
  }

  function removeFromCart(id) { saveCart(getCart().filter((x) => x.id !== id)); }
  function clearCart() { saveCart([]); }

  function cartCount() { return getCart().reduce((s, x) => s + x.qty, 0); }
  function cartTotal() {
    return getCart().reduce((s, x) => {
      const p = getProduct(x.id);
      return p ? s + p.price * x.qty : s;
    }, 0);
  }

  function updateCartBadge() {
    const els = document.querySelectorAll('[data-cart-badge]');
    const n = cartCount();
    els.forEach((el) => { el.textContent = faNum(n); el.style.display = n > 0 ? 'grid' : 'none'; });
  }

  /* ---------------- orders API ---------------- */
  function getOrders() { return load(LS.ORDERS, []); }
  function saveOrders(o) { save(LS.ORDERS, o); }

  function createOrder(data) {
    const orders = getOrders();
    const order = {
      id: uid('NX'),
      code: 'NX-' + String(1000 + orders.length + 1),
      createdAt: Date.now(),
      status: 'pending',
      items: data.items,
      total: data.total,
      customer: data.customer,
      note: data.note || '',
      receipt: data.receipt || null, // { name, type, size, dataUrl }
    };
    orders.unshift(order);
    saveOrders(orders);
    return order;
  }

  function setOrderStatus(id, status) {
    const orders = getOrders();
    const o = orders.find((x) => x.id === id);
    if (o) { o.status = status; o.statusAt = Date.now(); saveOrders(orders); }
  }

  function deleteOrder(id) {
    saveOrders(getOrders().filter((o) => o.id !== id));
  }

  /* ---------------- support chat API ---------------- */
  /* one thread per browser (visitor). Admin sees all threads. */
  function threadId() { return 'visitor-' + (load('nexus.visitorId', null) || uid('v').slice(3)); }
  function ensureVisitorId() {
    /* same id as the cloud slot — one identity everywhere */
    return getSlot();
  }

  function getThreads() { return load(LS.CHAT, []); }
  function saveThreads(t) { save(LS.CHAT, t); }

  function getThread(id) {
    return getThreads().find((t) => t.id === id) || null;
  }

  function sendMessage(text, from) {
    /* the thread id IS the visitor's cloud slot id, so the admin panel
       can always write replies straight back to the right slot */
    const tid = getSlot();
    const threads = getThreads();
    let thread = threads.find((t) => t.id === tid);
    if (!thread) {
      thread = {
        id: tid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        unreadForAdmin: 0,
        unreadForUser: 0,
        messages: [],
      };
      threads.unshift(thread);
    }
    thread.messages.push({
      from: from === 'admin' ? 'admin' : 'user',
      text: String(text || '').slice(0, 1000),
      at: Date.now(),
    });
    thread.updatedAt = Date.now();
    if (from === 'admin') thread.unreadForUser = (thread.unreadForUser || 0) + 1;
    else thread.unreadForAdmin = (thread.unreadForAdmin || 0) + 1;
    /* keep most-recent first */
    threads.sort((a, b) => b.updatedAt - a.updatedAt);
    saveThreads(threads);
    return thread;
  }

  function markRead(id, side) {
    const threads = getThreads();
    const t = threads.find((x) => x.id === id);
    if (t) {
      if (side === 'admin') t.unreadForAdmin = 0;
      else t.unreadForUser = 0;
      saveThreads(threads);
    }
  }

  function adminUnreadCount() {
    return getThreads().reduce((s, t) => s + (t.unreadForAdmin || 0), 0);
  }

  function userUnreadCount() {
    const tid = getSlot();
    const t = getThreads().find((x) => x.id === tid);
    return t ? (t.unreadForUser || 0) : 0;
  }

  function deleteThread(id) {
    saveThreads(getThreads().filter((t) => t.id !== id));
  }

  /* ---------------- admin auth ---------------- */
  const DEFAULT_PASS = '123456';
  function getPass() { return load(LS.ADMIN, { pass: DEFAULT_PASS }).pass; }
  function setPass(p) { save(LS.ADMIN, { pass: p }); }
  function checkPass(p) { return String(p) === getPass(); }
  function isUnlocked() { return sessionStorage.getItem('nexus.adminUnlocked') === '1'; }
  function unlock() { sessionStorage.setItem('nexus.adminUnlocked', '1'); }
  function lock() { sessionStorage.removeItem('nexus.adminUnlocked'); }

  /* ---------------- misc helpers ---------------- */
  function faDate(ts) {
    try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(ts)); }
    catch (e) { return ''; }
  }
  function faTime(ts) {
    try { return new Intl.DateTimeFormat('fa-IR', { timeStyle: 'short' }).format(new Date(ts)); }
    catch (e) { return ''; }
  }
  function faDateTime(ts) { return faDate(ts) + ' — ' + faTime(ts); }

  function stars(r) {
    const full = Math.round(r || 0);
    return '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full);
  }

  function statusInfo(s) {
    switch (s) {
      case 'pending':   return { label: 'در انتظار تایید فیش', dot: 'var(--amber)', bg: 'rgba(244,176,106,.12)' };
      case 'confirmed': return { label: 'تایید شد — در حال پردازش', dot: 'var(--accent)', bg: 'rgba(124,196,255,.12)' };
      case 'shipped':   return { label: 'ارسال شد', dot: '#5ee7a1', bg: 'rgba(94,231,161,.12)' };
      case 'delivered': return { label: 'تحویل داده شد', dot: '#8a93a6', bg: 'rgba(138,147,166,.12)' };
      case 'rejected':  return { label: 'رد شد', dot: '#ff7a7a', bg: 'rgba(255,122,122,.12)' };
      default:          return { label: s, dot: '#8a93a6', bg: 'rgba(138,147,166,.12)' };
    }
  }

  /* ---------------- export ---------------- */
  window.NexusStore = {
    faNum, toman, digitsToEn, esc, uid,
    getProducts, saveProducts, resetProducts, getProduct, upsertProduct, deleteProduct,
    getCart, addToCart, setQty, removeFromCart, clearCart, cartCount, cartTotal, updateCartBadge,
    getOrders, createOrder, setOrderStatus, deleteOrder,
    getThreads, getThread, sendMessage, markRead, adminUnreadCount, userUnreadCount, deleteThread, ensureVisitorId,
    getPass, setPass, checkPass, isUnlocked, unlock, lock,
    faDate, faTime, faDateTime, stars, statusInfo,
    /* cloud sync */
    getSlot, setSlot, cloudGetAllSlots, adminSync, pushOrders, pushChat, pullSlot, shrinkImage,
    pushReplyToSlot, mergeChatRemote, removeSlotFromIndex, replyToThread,
  };
})();
