# Разделить счёт — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a PWA bill-splitting app with 4 animated screens, OCR receipt scanning, and an animated payment tracker.

**Architecture:** Vanilla JS single-page app with a client-side screen router (slide transitions). All state lives in a single `session` object that's serialised to localStorage and URL hash. No server, no build step — open `index.html` directly in a browser.

**Tech Stack:** HTML5, CSS custom properties, Vanilla JS (ES modules via `<script type="module">`), Tesseract.js (lazy CDN), Canvas API for confetti, Service Worker for offline.

---

## File Map

| File | Responsibility |
|------|---------------|
| `index.html` | App shell + all 4 screen `<template>` elements |
| `js/app.js` | State object, screen router, init, event wiring |
| `js/ocr.js` | Tesseract.js lazy loader + receipt text parser |
| `js/share.js` | URL hash encode / decode |
| `js/confetti.js` | Canvas-based confetti burst |
| `style.css` | CSS custom properties (tokens) + all component styles |
| `sw.js` | Service Worker — cache-first offline strategy |
| `manifest.json` | PWA metadata (name, icons, theme colour) |
| `icons/icon.svg` | Source SVG icon (used for both 192 + 512 sizes) |
| `methodology.md` | Copied from `~/Desktop/СИСТЕМА_РАБОТЫ.md` |
| `methodology-prompt.md` | Copied from `~/Desktop/ПРОМТ_НОВЫЙ_ПРОЕКТ.md` |

---

## Task 1: PWA scaffold

**Files:**
- Create: `manifest.json`
- Create: `icons/icon.svg`
- Create: `sw.js`
- Create: `index.html`

- [ ] **Step 1: Create `manifest.json`**

```json
{
  "name": "Разделить счёт",
  "short_name": "Счёт",
  "start_url": "./",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#E8131E",
  "icons": [
    { "src": "icons/icon.svg", "sizes": "any", "type": "image/svg+xml" }
  ]
}
```

- [ ] **Step 2: Create `icons/icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="40" fill="#E8131E"/>
  <text x="96" y="130" font-size="100" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif" font-weight="700">₸</text>
</svg>
```

- [ ] **Step 3: Create `sw.js`**

```js
const CACHE = 'razdelit-v1';
const ASSETS = ['./', './index.html', './style.css', './js/app.js',
  './js/ocr.js', './js/share.js', './js/confetti.js', './manifest.json',
  './icons/icon.svg'];

self.addEventListener('install', e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))));

self.addEventListener('fetch', e =>
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
```

- [ ] **Step 4: Create `index.html` shell (no screen content yet)**

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#E8131E">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <title>Разделить счёт</title>
  <link rel="manifest" href="manifest.json">
  <link rel="icon" href="icons/icon.svg">
  <link rel="apple-touch-icon" href="icons/icon.svg">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app">
    <div id="screen-container"></div>
  </div>

  <!-- Screen templates inserted in Task 3 -->

  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 5: Create placeholder JS files so imports resolve**

```bash
mkdir -p js
echo "// app.js" > js/app.js
echo "// ocr.js" > js/ocr.js
echo "// share.js" > js/share.js
echo "// confetti.js" > js/confetti.js
```

- [ ] **Step 6: Verify in browser**

Open `index.html` in Chrome. DevTools → Application → Manifest — should show app name and icon. No console errors.

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "feat: PWA scaffold — manifest, sw, icon, index shell"
```

---

## Task 2: CSS design tokens + base styles

**Files:**
- Create: `style.css`

- [ ] **Step 1: Write `style.css`**

```css
:root {
  --red: #E8131E;
  --red-light: #fde8e9;
  --green: #0F6E56;
  --green-light: #e1f5ee;
  --text-primary: #111;
  --text-secondary: #555;
  --text-tertiary: #999;
  --bg: #f5f5f5;
  --card: #fff;
  --border: #e5e5e5;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 999px;
  --font: system-ui, -apple-system, sans-serif;
  --transition: 300ms ease;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body { height: 100%; background: var(--bg); font-family: var(--font); color: var(--text-primary); -webkit-tap-highlight-color: transparent; }

#app { height: 100%; display: flex; flex-direction: column; max-width: 480px; margin: 0 auto; }

#screen-container { flex: 1; position: relative; overflow: hidden; }

/* Screen transitions */
.screen { position: absolute; inset: 0; background: var(--bg); padding: 20px 16px 32px; overflow-y: auto; transition: transform var(--transition); display: flex; flex-direction: column; gap: 16px; }
.screen.enter-right { transform: translateX(100%); }
.screen.enter-left  { transform: translateX(-100%); }
.screen.active      { transform: translateX(0); }
.screen.exit-left   { transform: translateX(-100%); }
.screen.exit-right  { transform: translateX(100%); }

/* Typography */
.screen-title { font-size: 22px; font-weight: 700; color: var(--text-primary); }
.label { font-size: 13px; color: var(--text-secondary); }
.amount-big { font-size: 36px; font-weight: 700; color: var(--text-primary); }
.amount-note { font-size: 13px; color: var(--text-tertiary); }

/* Card */
.card { background: var(--card); border-radius: var(--radius-lg); padding: 16px; }

/* Button */
.btn-primary { width: 100%; padding: 16px; background: var(--red); color: #fff; border: none; border-radius: var(--radius-md); font-size: 16px; font-weight: 600; cursor: pointer; transition: opacity var(--transition); margin-top: auto; }
.btn-primary:active { opacity: 0.85; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

/* Back button */
.btn-back { background: none; border: none; color: var(--red); font-size: 15px; cursor: pointer; padding: 0; display: flex; align-items: center; gap: 4px; }

/* Input */
input[type="text"], input[type="number"] {
  width: 100%; padding: 12px 14px; border: 1px solid var(--border); border-radius: var(--radius-sm);
  font-size: 16px; font-family: var(--font); color: var(--text-primary); background: #fff;
  outline: none; transition: border-color var(--transition);
}
input:focus { border-color: var(--red); }

/* Avatar */
.avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; flex-shrink: 0; }

/* Progress bar */
.progress-track { height: 6px; background: var(--border); border-radius: var(--radius-full); overflow: hidden; }
.progress-fill  { height: 100%; background: var(--red); border-radius: var(--radius-full); transition: width 600ms cubic-bezier(0.34,1.56,0.64,1); }

/* Participant card */
.participant-card { display: flex; align-items: center; gap: 12px; background: var(--card); border-radius: var(--radius-md); padding: 14px; cursor: pointer; transition: background var(--transition); }
.participant-card:active { background: #fafafa; }
.participant-card.paid .progress-fill { background: var(--green); }
.participant-info { flex: 1; min-width: 0; }
.participant-name { font-size: 15px; font-weight: 500; }
.participant-amount { font-size: 13px; color: var(--text-secondary); }
.participant-status { font-size: 13px; font-weight: 600; color: var(--green); white-space: nowrap; }
.participant-status.pending { color: var(--text-tertiary); }

/* Divider */
.divider { display: flex; align-items: center; gap: 8px; }
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
.divider span { font-size: 12px; color: var(--text-tertiary); }

/* Counter */
.counter { display: flex; align-items: center; gap: 16px; }
.counter-btn { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border); background: #fff; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background var(--transition); }
.counter-btn.inc { background: var(--red); color: #fff; border-color: var(--red); }
.counter-btn:active { opacity: 0.8; }
.counter-value { font-size: 28px; font-weight: 700; min-width: 40px; text-align: center; }

/* Items list */
.items-list { display: flex; flex-direction: column; gap: 8px; }
.item-row { display: flex; align-items: center; gap: 8px; }
.item-row input[type="text"] { flex: 1; }
.item-row input[type="number"] { width: 100px; }
.item-row .btn-remove { background: none; border: none; color: var(--text-tertiary); font-size: 20px; cursor: pointer; padding: 0 4px; flex-shrink: 0; }

/* Scan area */
.scan-area { border: 2px dashed var(--border); border-radius: var(--radius-lg); padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 12px; cursor: pointer; transition: border-color var(--transition); }
.scan-area:active { border-color: var(--red); }
.scan-icon { font-size: 40px; }
.scan-label { font-size: 15px; color: var(--text-secondary); text-align: center; }

/* OCR status */
.ocr-status { font-size: 13px; color: var(--text-secondary); text-align: center; padding: 8px; }

/* Total summary */
.total-card { background: var(--card); border-radius: var(--radius-lg); padding: 20px; text-align: center; }
.total-header { font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; }
.total-subtext { font-size: 13px; color: var(--text-tertiary); margin-top: 4px; }

/* Collection header */
.collection-header { display: flex; align-items: center; justify-content: space-between; }
.btn-share { background: none; border: none; color: var(--red); font-size: 24px; cursor: pointer; padding: 4px; }

/* Confetti canvas */
#confetti-canvas { position: fixed; inset: 0; pointer-events: none; z-index: 100; }
```

- [ ] **Step 2: Open `index.html` in browser — background should be `#f5f5f5`, no errors**

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "feat: CSS design tokens and base component styles"
```

---

## Task 3: Screen HTML templates

**Files:**
- Modify: `index.html` — add 4 `<template>` blocks before `</body>`

- [ ] **Step 1: Add screen templates to `index.html` before `</body>`**

```html
<!-- SCREEN 1 -->
<template id="tmpl-screen1">
  <div class="screen" data-screen="1">
    <button class="btn-back" data-action="back">← Назад</button>
    <h1 class="screen-title">Добавить счёт</h1>

    <div class="scan-area" id="scan-trigger">
      <span class="scan-icon">📷</span>
      <span class="scan-label">Сфоткать чек</span>
      <input type="file" id="camera-input" accept="image/*" capture="environment" style="display:none">
    </div>
    <div id="ocr-status" class="ocr-status" style="display:none"></div>

    <div class="divider"><span>или ввести вручную</span></div>

    <div class="card">
      <div class="label" style="margin-bottom:8px">Итого</div>
      <div style="display:flex;align-items:baseline;gap:6px">
        <input type="number" id="total-input" placeholder="0" min="0" style="font-size:28px;font-weight:700;padding:8px 10px">
        <span style="font-size:20px;color:var(--text-secondary)">₸</span>
      </div>
    </div>

    <div>
      <div class="label" style="margin-bottom:8px">Позиции <span style="color:var(--text-tertiary)">(необязательно)</span></div>
      <div class="items-list" id="items-list"></div>
      <button id="add-item-btn" style="background:none;border:none;color:var(--red);font-size:14px;cursor:pointer;padding:8px 0;display:flex;align-items:center;gap:4px">
        + Добавить позицию
      </button>
    </div>

    <button class="btn-primary" id="s1-next" disabled>Далее</button>
  </div>
</template>

<!-- SCREEN 2 -->
<template id="tmpl-screen2">
  <div class="screen" data-screen="2">
    <button class="btn-back" data-action="back">← Назад</button>
    <h1 class="screen-title">Участники</h1>

    <div class="card">
      <div class="label" style="margin-bottom:12px">Нас</div>
      <div class="counter">
        <button class="counter-btn" id="dec-btn">−</button>
        <span class="counter-value" id="count-display">2</span>
        <button class="counter-btn inc" id="inc-btn">+</button>
      </div>
    </div>

    <div>
      <div class="label" style="margin-bottom:8px">Имена <span style="color:var(--text-tertiary)">(необязательно)</span></div>
      <div id="names-list" style="display:flex;flex-direction:column;gap:8px"></div>
    </div>

    <div id="items-assign-section" style="display:none">
      <div class="label" style="margin-bottom:8px">Кто что ел</div>
      <div id="items-assign-list" style="display:flex;flex-direction:column;gap:8px"></div>
    </div>

    <button class="btn-primary" id="s2-next">Далее</button>
  </div>
</template>

<!-- SCREEN 3 -->
<template id="tmpl-screen3">
  <div class="screen" data-screen="3">
    <button class="btn-back" data-action="back">← Назад</button>
    <h1 class="screen-title">Итог</h1>

    <div class="total-card">
      <div class="total-header" id="s3-header">Каждый платит</div>
      <div class="amount-big" id="s3-amount"></div>
      <div class="amount-note" id="s3-note"></div>
    </div>

    <div id="s3-items-section" style="display:none">
      <div class="label" style="margin-bottom:8px">Позиции счёта</div>
      <div class="card">
        <div id="s3-items-list" style="display:flex;flex-direction:column;gap:0"></div>
      </div>
    </div>

    <div id="s3-individual-section" style="display:none">
      <div class="label" style="margin-bottom:8px">Индивидуально</div>
      <div id="s3-individual-list" style="display:flex;flex-direction:column;gap:8px"></div>
    </div>

    <button class="btn-primary" id="s3-next">Начать сбор</button>
  </div>
</template>

<!-- SCREEN 4 -->
<template id="tmpl-screen4">
  <div class="screen" data-screen="4">
    <div class="collection-header">
      <h1 class="screen-title">Кто закинул</h1>
      <button class="btn-share" id="share-btn" aria-label="Поделиться">⬆</button>
    </div>

    <div class="card" style="display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="label">Собрано</span>
        <span id="s4-collected" style="font-size:15px;font-weight:600"></span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" id="s4-total-bar" style="width:0%"></div>
      </div>
    </div>

    <div id="s4-participants" style="display:flex;flex-direction:column;gap:8px"></div>

    <button class="btn-primary" id="s4-new" style="display:none">Новый счёт</button>

    <canvas id="confetti-canvas" style="display:none"></canvas>
  </div>
</template>
```

- [ ] **Step 2: Verify templates are in DOM (DevTools → Elements — 4 `<template>` tags visible)**

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add 4 screen HTML templates"
```

---

## Task 4: Screen router + state skeleton

**Files:**
- Modify: `js/app.js` — full router + state

- [ ] **Step 1: Write `js/app.js`**

```js
// js/app.js
import { encodeSession, decodeSession } from './share.js';

// ─── State ───────────────────────────────────────────────────────────────────
export const COLORS = [
  '#E8131E','#1D9E75','#7F77DD','#D85A30','#BA7517','#185FA5','#A32D2D','#3B6D11'
];

export const state = {
  total: 0,
  currency: '₸',
  items: [],           // [{ name, price }]
  participants: [],    // [{ id, name, color, share, paid, paidAmount }]
};

// ─── Router ───────────────────────────────────────────────────────────────────
let currentScreen = null;

export function showScreen(n, direction = 'forward') {
  const tmpl = document.getElementById(`tmpl-screen${n}`);
  if (!tmpl) return;
  const container = document.getElementById('screen-container');

  const incoming = tmpl.content.firstElementChild.cloneNode(true);
  incoming.classList.add(direction === 'forward' ? 'enter-right' : 'enter-left');
  container.appendChild(incoming);

  // wire up back buttons
  incoming.querySelectorAll('[data-action="back"]').forEach(btn =>
    btn.addEventListener('click', () => showScreen(n - 1, 'backward')));

  // screen-specific init
  const inits = { 1: initScreen1, 2: initScreen2, 3: initScreen3, 4: initScreen4 };
  if (inits[n]) inits[n](incoming);

  // animate out old screen
  if (currentScreen) {
    const old = currentScreen;
    old.classList.remove('active');
    old.classList.add(direction === 'forward' ? 'exit-left' : 'exit-right');
    old.addEventListener('transitionend', () => old.remove(), { once: true });
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      incoming.classList.remove('enter-right', 'enter-left');
      incoming.classList.add('active');
    });
  });

  currentScreen = incoming;
}

// ─── Screen inits (stubs — filled in later tasks) ─────────────────────────────
function initScreen1(el) {}
function initScreen2(el) {}
function initScreen3(el) {}
function initScreen4(el) {}

// ─── Boot ─────────────────────────────────────────────────────────────────────
function boot() {
  // Register SW
  if ('serviceWorker' in navigator)
    navigator.serviceWorker.register('./sw.js');

  // Check URL hash for shared session
  const shared = decodeSession(location.hash);
  if (shared) {
    Object.assign(state, shared);
    showScreen(4);
  } else {
    showScreen(1);
  }
}

document.addEventListener('DOMContentLoaded', boot);
```

- [ ] **Step 2: Write `js/share.js`**

```js
// js/share.js
export function encodeSession(session) {
  return '#' + btoa(unescape(encodeURIComponent(JSON.stringify(session))));
}

export function decodeSession(hash) {
  if (!hash || hash.length < 2) return null;
  try {
    return JSON.parse(decodeURIComponent(escape(atob(hash.slice(1)))));
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Open `index.html` in browser — Screen 1 should appear (empty but visible), no JS errors**

- [ ] **Step 4: Commit**

```bash
git add js/app.js js/share.js
git commit -m "feat: screen router and state skeleton"
```

---

## Task 5: Screen 1 — manual input logic

**Files:**
- Modify: `js/app.js` — fill in `initScreen1`

- [ ] **Step 1: Replace `initScreen1` stub in `js/app.js`**

```js
function initScreen1(el) {
  const totalInput = el.querySelector('#total-input');
  const itemsList  = el.querySelector('#items-list');
  const addItemBtn = el.querySelector('#add-item-btn');
  const nextBtn    = el.querySelector('#s1-next');

  function renderItems() {
    itemsList.innerHTML = '';
    state.items.forEach((item, i) => {
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <input type="text" placeholder="Название" value="${item.name}">
        <input type="number" placeholder="0" min="0" value="${item.price || ''}">
        <button class="btn-remove">×</button>`;
      row.querySelector('input[type="text"]').addEventListener('input', e => {
        state.items[i].name = e.target.value;
      });
      row.querySelector('input[type="number"]').addEventListener('input', e => {
        state.items[i].price = parseFloat(e.target.value) || 0;
        syncTotal();
      });
      row.querySelector('.btn-remove').addEventListener('click', () => {
        state.items.splice(i, 1);
        renderItems();
        syncTotal();
      });
      itemsList.appendChild(row);
    });
  }

  function syncTotal() {
    if (state.items.length > 0) {
      const sum = state.items.reduce((a, b) => a + (b.price || 0), 0);
      if (sum > 0) {
        state.total = sum;
        totalInput.value = sum;
      }
    }
    nextBtn.disabled = state.total <= 0;
  }

  totalInput.value = state.total || '';
  totalInput.addEventListener('input', e => {
    state.total = parseFloat(e.target.value) || 0;
    nextBtn.disabled = state.total <= 0;
  });

  addItemBtn.addEventListener('click', () => {
    state.items.push({ name: '', price: 0 });
    renderItems();
  });

  nextBtn.addEventListener('click', () => showScreen(2));

  renderItems();
  syncTotal();
}
```

- [ ] **Step 2: Verify in browser**

  1. Open Screen 1. Type `12400` in the total field → «Далее» button activates.
  2. Click «+ Добавить позицию» → a row appears.
  3. Type name and price in the row → total field syncs.
  4. Click × on the row → row disappears.
  5. Click «Далее» → Screen 2 appears with slide animation.

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: screen 1 manual input logic"
```

---

## Task 6: Screen 1 — OCR (Tesseract.js)

**Files:**
- Create: `js/ocr.js`
- Modify: `js/app.js` — wire OCR into `initScreen1`

- [ ] **Step 1: Write `js/ocr.js`**

```js
// js/ocr.js — lazy-loads Tesseract.js (~4 MB) only when called

let tesseractReady = false;

export async function recogniseReceipt(imageFile, onStatus) {
  if (!tesseractReady) {
    onStatus('Загружаю OCR…');
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    tesseractReady = true;
  }

  onStatus('Распознаю текст…');
  const { data: { text } } = await Tesseract.recognize(imageFile, 'rus+eng');
  return parseReceiptText(text);
}

export function parseReceiptText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const items = [];
  let total = 0;

  const TOTAL_RE = /итого|total|сумма|к\s*оплате/i;
  const PRICE_RE = /(\d[\d\s]*[.,]\d{2}|\d{3,})/g;

  for (const line of lines) {
    if (TOTAL_RE.test(line)) {
      const nums = [...line.matchAll(PRICE_RE)].map(m =>
        parseFloat(m[0].replace(/\s/g, '').replace(',', '.')));
      if (nums.length) total = Math.max(...nums);
      continue;
    }
    const nums = [...line.matchAll(PRICE_RE)].map(m =>
      parseFloat(m[0].replace(/\s/g, '').replace(',', '.')));
    if (nums.length) {
      const price = nums[nums.length - 1];
      const name = line.replace(PRICE_RE, '').replace(/[×x]\d+/i, '').trim() || 'Позиция';
      if (price > 0) items.push({ name, price });
    }
  }

  if (!total && items.length)
    total = items.reduce((a, b) => a + b.price, 0);

  return { items, total };
}
```

- [ ] **Step 2: Wire OCR into `initScreen1` in `js/app.js`**

Add these lines at the top of `initScreen1`, after declaring `nextBtn`:

```js
  // OCR wiring
  import('./ocr.js').then(({ recogniseReceipt }) => {
    const scanTrigger  = el.querySelector('#scan-trigger');
    const cameraInput  = el.querySelector('#camera-input');
    const ocrStatus    = el.querySelector('#ocr-status');

    scanTrigger.addEventListener('click', () => cameraInput.click());

    cameraInput.addEventListener('change', async () => {
      const file = cameraInput.files[0];
      if (!file) return;
      ocrStatus.style.display = 'block';
      try {
        const result = await recogniseReceipt(file, msg => ocrStatus.textContent = msg);
        if (result.total) {
          state.total = result.total;
          totalInput.value = result.total;
        }
        if (result.items.length) {
          state.items = result.items;
          renderItems();
        }
        ocrStatus.textContent = `Распознано ${result.items.length} позиций`;
        syncTotal();
      } catch (err) {
        ocrStatus.textContent = 'Не удалось распознать — введите вручную';
      }
    });
  });
```

Note: the `import()` must be inside `initScreen1`. Since `app.js` is an ES module this is fine.

- [ ] **Step 3: Verify in browser**

  1. Click the dashed area «Сфоткать чек» → file picker opens.
  2. Choose any image from your Photos — OCR status should update: «Загружаю OCR…» → «Распознаю текст…» → «Распознано N позиций».
  3. If the image has numbers, some items should appear in the list.
  4. Total field should update if a total line was found.

- [ ] **Step 4: Commit**

```bash
git add js/ocr.js js/app.js
git commit -m "feat: OCR receipt scanning via Tesseract.js (lazy loaded)"
```

---

## Task 7: Screen 2 — participants

**Files:**
- Modify: `js/app.js` — fill in `initScreen2`

- [ ] **Step 1: Replace `initScreen2` stub in `js/app.js`**

```js
function initScreen2(el) {
  let count = Math.max(state.participants.length, 2);
  const countDisplay     = el.querySelector('#count-display');
  const namesList        = el.querySelector('#names-list');
  const itemsAssignSec   = el.querySelector('#items-assign-section');
  const itemsAssignList  = el.querySelector('#items-assign-list');
  const nextBtn          = el.querySelector('#s2-next');

  function buildParticipants() {
    const existing = state.participants;
    state.participants = Array.from({ length: count }, (_, i) => ({
      id: i,
      name: existing[i]?.name || '',
      color: COLORS[i % COLORS.length],
      share: 0, paid: false, paidAmount: 0,
    }));
  }

  function renderNames() {
    countDisplay.textContent = count;
    namesList.innerHTML = '';
    state.participants.forEach((p, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px';
      row.innerHTML = `
        <div class="avatar" style="background:${p.color}22;color:${p.color}">${p.name ? p.name[0].toUpperCase() : (i+1)}</div>
        <input type="text" placeholder="Участник ${i+1}" value="${p.name}" style="flex:1">`;
      row.querySelector('input').addEventListener('input', e => {
        state.participants[i].name = e.target.value;
        const av = row.querySelector('.avatar');
        av.textContent = e.target.value ? e.target.value[0].toUpperCase() : (i+1);
        renderItemsAssign();
      });
      namesList.appendChild(row);
    });
    renderItemsAssign();
  }

  function renderItemsAssign() {
    if (!state.items.length) { itemsAssignSec.style.display = 'none'; return; }
    itemsAssignSec.style.display = 'block';
    itemsAssignList.innerHTML = '';
    state.items.forEach((item, ii) => {
      const row = document.createElement('div');
      row.className = 'card';
      row.style.cssText = 'padding:12px;display:flex;flex-direction:column;gap:8px';
      row.innerHTML = `<div style="display:flex;justify-content:space-between">
        <span style="font-size:14px;font-weight:500">${item.name || 'Позиция'}</span>
        <span style="font-size:14px;color:var(--text-secondary)">${item.price} ₸</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px" id="assign-${ii}"></div>`;
      const container = row.querySelector(`#assign-${ii}`);
      state.participants.forEach((p, pi) => {
        const label = document.createElement('label');
        label.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer';
        label.innerHTML = `<input type="checkbox" data-item="${ii}" data-p="${pi}" checked> ${p.name || 'Участник '+(pi+1)}`;
        container.appendChild(label);
      });
      itemsAssignList.appendChild(row);
    });
  }

  el.querySelector('#dec-btn').addEventListener('click', () => {
    if (count <= 2) return;
    count--;
    buildParticipants();
    renderNames();
  });

  el.querySelector('#inc-btn').addEventListener('click', () => {
    count++;
    buildParticipants();
    renderNames();
  });

  nextBtn.addEventListener('click', () => {
    // Calculate shares
    if (state.items.length) {
      // per-item assignment
      state.participants.forEach(p => p.share = 0);
      state.items.forEach((item, ii) => {
        const checks = el.querySelectorAll(`input[data-item="${ii}"]:checked`);
        const split = item.price / (checks.length || 1);
        checks.forEach(c => {
          state.participants[parseInt(c.dataset.p)].share += split;
        });
      });
      state.total = state.participants.reduce((a, p) => a + p.share, 0);
    } else {
      const share = state.total / count;
      state.participants.forEach(p => p.share = share);
    }
    showScreen(3);
  });

  buildParticipants();
  renderNames();
}
```

- [ ] **Step 2: Verify in browser**

  1. Enter total 12000, go to Screen 2.
  2. Counter starts at 2. Hit + twice → 4. Names show as «Участник 1–4».
  3. Type names in the fields → avatars update with initials.
  4. Hit − → goes back to 3.
  5. Click «Далее» → Screen 3 appears.

- [ ] **Step 3: Verify with items**

  1. Go back to Screen 1, add 2 items (e.g. «Шашлык 4000», «Пиво 2000»).
  2. Go to Screen 2 → «Кто что ел» section appears with checkboxes.
  3. Uncheck one person from one item → Screen 3 should show individual amounts.

- [ ] **Step 4: Commit**

```bash
git add js/app.js
git commit -m "feat: screen 2 participants counter, names, and item assignment"
```

---

## Task 8: Screen 3 — split results

**Files:**
- Modify: `js/app.js` — fill in `initScreen3`

- [ ] **Step 1: Replace `initScreen3` stub in `js/app.js`**

```js
function initScreen3(el) {
  const amountEl    = el.querySelector('#s3-amount');
  const noteEl      = el.querySelector('#s3-note');
  const headerEl    = el.querySelector('#s3-header');
  const itemsSec    = el.querySelector('#s3-items-section');
  const itemsList   = el.querySelector('#s3-items-list');
  const indivSec    = el.querySelector('#s3-individual-section');
  const indivList   = el.querySelector('#s3-individual-list');
  const nextBtn     = el.querySelector('#s3-next');

  const fmt = n => Math.round(n).toLocaleString('ru-RU');
  const allEqual = state.participants.every(p =>
    Math.abs(p.share - state.participants[0].share) < 1);

  if (allEqual) {
    headerEl.textContent = 'Каждый платит';
    amountEl.textContent = fmt(state.participants[0].share) + ' ₸';
    noteEl.textContent = `из ${fmt(state.total)} ₸ · ${state.participants.length} человека`;
    indivSec.style.display = 'none';
  } else {
    headerEl.textContent = 'Индивидуально';
    amountEl.textContent = fmt(state.total) + ' ₸';
    noteEl.textContent = `итого · ${state.participants.length} человека`;
    indivSec.style.display = 'block';
    state.participants.forEach(p => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;background:#fff;border-radius:10px;padding:12px 14px';
      const name = p.name || `Участник ${p.id + 1}`;
      row.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar" style="background:${p.color}22;color:${p.color}">${name[0].toUpperCase()}</div>
          <span style="font-size:15px">${name}</span>
        </div>
        <span style="font-size:16px;font-weight:600">${fmt(p.share)} ₸</span>`;
      indivList.appendChild(row);
    });
  }

  if (state.items.length) {
    itemsSec.style.display = 'block';
    state.items.forEach((item, i) => {
      const row = document.createElement('div');
      row.style.cssText = `display:flex;justify-content:space-between;padding:10px 0;${i ? 'border-top:1px solid var(--border)' : ''}`;
      row.innerHTML = `<span style="font-size:14px;color:var(--text-secondary)">${item.name}</span>
                       <span style="font-size:14px">${fmt(item.price)} ₸</span>`;
      itemsList.appendChild(row);
    });
  }

  nextBtn.addEventListener('click', () => showScreen(4));
}
```

- [ ] **Step 2: Verify in browser**

  1. Equal split: 12000 ₸, 4 people → «Каждый платит 3 000 ₸».
  2. Unequal (via item assignment) → individual amounts listed.
  3. With items → items section visible.
  4. «Начать сбор» → Screen 4.

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: screen 3 split results display"
```

---

## Task 9: Screen 4 — tracker

**Files:**
- Modify: `js/app.js` — fill in `initScreen4`

- [ ] **Step 1: Replace `initScreen4` stub in `js/app.js`**

```js
function initScreen4(el) {
  const collectedEl = el.querySelector('#s4-collected');
  const totalBar    = el.querySelector('#s4-total-bar');
  const pList       = el.querySelector('#s4-participants');
  const newBtn      = el.querySelector('#s4-new');
  const shareBtn    = el.querySelector('#share-btn');

  const fmt = n => Math.round(n).toLocaleString('ru-RU');

  function updateTotals() {
    const collected = state.participants.reduce((a, p) => a + p.paidAmount, 0);
    const pct = Math.min(100, (collected / state.total) * 100);
    collectedEl.textContent = `${fmt(collected)} / ${fmt(state.total)} ₸`;
    totalBar.style.width = pct + '%';

    if (pct >= 100) {
      newBtn.style.display = 'block';
      import('./confetti.js').then(m => m.burst());
    }
    saveHistory();
  }

  function buildCards() {
    pList.innerHTML = '';
    state.participants.forEach((p, i) => {
      const name = p.name || `Участник ${p.id + 1}`;
      const card = document.createElement('div');
      card.className = 'participant-card' + (p.paid ? ' paid' : '');
      card.innerHTML = `
        <div class="avatar" style="background:${p.color}22;color:${p.color}">${name[0].toUpperCase()}</div>
        <div class="participant-info">
          <div class="participant-name">${name}</div>
          <div class="participant-amount">${fmt(p.share)} ₸</div>
          <div class="progress-track" style="margin-top:6px">
            <div class="progress-fill" style="width:${p.paid ? 100 : 0}%"></div>
          </div>
        </div>
        <div class="participant-status ${p.paid ? '' : 'pending'}">${p.paid ? '✓ закинул' : 'ждём'}</div>`;

      // tap = mark paid
      card.addEventListener('click', () => {
        if (!p.paid) {
          p.paid = true;
          p.paidAmount = p.share;
          card.classList.add('paid');
          card.querySelector('.progress-fill').style.width = '100%';
          card.querySelector('.participant-status').textContent = '✓ закинул';
          card.querySelector('.participant-status').classList.remove('pending');
          updateTotals();
        }
      });

      // long-press = enter custom amount
      let pressTimer;
      card.addEventListener('pointerdown', () => {
        pressTimer = setTimeout(() => {
          const amt = prompt(`Сколько закинул ${name}?`, p.share);
          if (amt !== null) {
            const v = parseFloat(amt) || 0;
            p.paidAmount = v;
            p.paid = v >= p.share;
            const pct = Math.min(100, (v / p.share) * 100);
            card.querySelector('.progress-fill').style.width = pct + '%';
            card.querySelector('.participant-status').textContent = p.paid ? '✓ закинул' : `${fmt(v)} ₸`;
            if (!p.paid) card.querySelector('.participant-status').classList.add('pending');
            if (p.paid) card.classList.add('paid');
            updateTotals();
          }
        }, 600);
      });
      card.addEventListener('pointerup', () => clearTimeout(pressTimer));
      card.addEventListener('pointerleave', () => clearTimeout(pressTimer));

      pList.appendChild(card);
    });
  }

  shareBtn.addEventListener('click', async () => {
    const url = location.origin + location.pathname + encodeSession(state);
    if (navigator.share) {
      await navigator.share({ title: 'Разделить счёт', url });
    } else {
      await navigator.clipboard.writeText(url);
      alert('Ссылка скопирована!');
    }
  });

  newBtn.addEventListener('click', () => {
    Object.assign(state, { total: 0, currency: '₸', items: [], participants: [] });
    location.hash = '';
    showScreen(1);
  });

  buildCards();
  updateTotals();
}

function saveHistory() {
  const key = 'razdelit-history';
  const history = JSON.parse(localStorage.getItem(key) || '[]');
  history.unshift({ ...state, date: new Date().toISOString() });
  localStorage.setItem(key, JSON.stringify(history.slice(0, 10)));
}
```

- [ ] **Step 2: Verify in browser**

  1. Complete the full flow (total → participants → split → tracker).
  2. Screen 4: participant cards appear with «ждём» status.
  3. Tap a card → progress bar fills to 100%, status → «✓ закинул».
  4. Overall bar updates.
  5. Long-press a card → prompt appears. Enter a partial amount → bar fills partially.
  6. All paid → «Новый счёт» button appears.
  7. Tap share → URL is copied or native share sheet opens.

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: screen 4 payment tracker with progress bars and sharing"
```

---

## Task 10: Confetti

**Files:**
- Modify: `js/confetti.js`

- [ ] **Step 1: Write `js/confetti.js`**

```js
// js/confetti.js
export function burst() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  canvas.style.display = 'block';
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');

  const COLORS = ['#E8131E','#1D9E75','#7F77DD','#FAC775','#85B7EB'];
  const particles = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height * -1,
    r: Math.random() * 6 + 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    speed: Math.random() * 3 + 2,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.2,
  }));

  let frame;
  const start = performance.now();

  function draw(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.y += p.speed;
      p.x += Math.sin(p.angle) * 1.5;
      p.angle += p.spin;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.r / 2, -p.r, p.r, p.r * 2);
      ctx.restore();
    });
    if (now - start < 1500) {
      frame = requestAnimationFrame(draw);
    } else {
      canvas.style.display = 'none';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  requestAnimationFrame(draw);
}
```

- [ ] **Step 2: Verify in browser**

  Mark all participants as paid → coloured rectangles rain down for 1.5 seconds, then disappear.

- [ ] **Step 3: Commit**

```bash
git add js/confetti.js
git commit -m "feat: confetti burst on 100% collection"
```

---

## Task 11: methodology.md + methodology-prompt.md

**Files:**
- Create: `methodology.md` (copy from `~/Desktop/СИСТЕМА_РАБОТЫ.md`)
- Create: `methodology-prompt.md` (copy from `~/Desktop/ПРОМТ_НОВЫЙ_ПРОЕКТ.md`)

- [ ] **Step 1: Copy files**

```bash
cp ~/Desktop/СИСТЕМА_РАБОТЫ.md "methodology.md"
cp ~/Desktop/ПРОМТ_НОВЫЙ_ПРОЕКТ.md "methodology-prompt.md"
```

- [ ] **Step 2: Verify files exist and are non-empty**

```bash
wc -l methodology.md methodology-prompt.md
```

Expected: both show > 0 lines.

- [ ] **Step 3: Commit**

```bash
git add methodology.md methodology-prompt.md
git commit -m "docs: add methodology and project-starter prompt"
```

---

## Task 12: Final polish + git init (if not done)

**Files:**
- Create: `README.md` (minimal)

- [ ] **Step 1: Create minimal README**

```bash
cat > README.md << 'EOF'
# Разделить счёт

PWA для дележа счёта в кафе. Сканирование чека, разбивка по участникам, трекер оплат.

## Запуск

Открой `index.html` в браузере или задеплой любой статик-хостинг (Netlify, Vercel, GitHub Pages).

## Стек

Vanilla JS · CSS custom properties · Tesseract.js (OCR) · Service Worker (офлайн) · URL hash (шеринг)
EOF
```

- [ ] **Step 2: Full end-to-end test on mobile**

  1. Открой Chrome DevTools → toggle device toolbar → iPhone 14 Pro.
  2. Пройди полный флоу: ввод суммы → 4 участника → итог → трекер → отметь всех → конфетти.
  3. Проверь DevTools → Application → Service Workers — SW registered и active.
  4. Проверь Application → Manifest — показывает иконку и название.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| PWA (manifest + SW + offline) | Task 1, SW wired in Task 4 |
| Фото чека + OCR | Task 6 |
| Ручной ввод суммы + позиций | Task 5 |
| Участники: счётчик + имена | Task 7 |
| Кто что ел (назначение позиций) | Task 7 |
| Итог: поровну + индивидуально | Task 8 |
| Трекер: прогресс-бар | Task 9 |
| Тап = закинул | Task 9 |
| Ввод суммы (долгое нажатие) | Task 9 |
| Шеринг через URL hash | Task 4 (share.js) + Task 9 |
| Конфетти при 100% | Task 10 |
| Слайд-анимации экранов | Task 4 |
| Стиль Kaspi (белый, красный) | Task 2 |
| methodology.md | Task 11 |
| methodology-prompt.md | Task 11 |
| localStorage история | Task 9 (saveHistory) |

**Gaps found and fixed:** none — all requirements covered.

**Type consistency:** `state.participants[i].share`, `.paid`, `.paidAmount`, `.color`, `.name`, `.id` used consistently across Tasks 7, 8, 9. `state.items[i].name`, `.price` consistent across Tasks 5, 7, 8. `encodeSession` / `decodeSession` named consistently in share.js and app.js.

**Placeholder scan:** no TBDs or TODOs remain in plan steps.
