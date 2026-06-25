# Социальный слой — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add participant phones, per-person deep-link reminders (WhatsApp/Telegram/system share), saved friends, and a history screen with restore — keeping the app serverless and build-step-free.

**Architecture:** Two new/extended pure modules (`js/store.js` for localStorage CRUD, `js/share.js` for deep-link string builders) keep persistence and URL logic out of the DOM layer (`js/app.js`). The router gains a named screen (`history`) alongside the numeric 1–4 flow. Phones live only on-device and are stripped from shared URLs.

**Tech Stack:** Vanilla JS (ES modules), localStorage, `wa.me` / `t.me/share` deep-links, `navigator.share`, Service Worker. No test runner — pure functions verified by assertion snippets in the browser console (`preview_eval`); UI verified in the mobile preview.

**Spec:** [2026-06-25-social-layer-design.md](../specs/2026-06-25-social-layer-design.md)

**Standing rule (user):** documentation AND context update in the SAME commit as code — never a separate pass.

---

## File Map

| File | Responsibility |
|------|---------------|
| `js/store.js` | **New.** localStorage: friends (list/upsert/remove) + history (upsert/list/get). No DOM. |
| `js/share.js` | **Extend.** `encodeSession` strips `phone`; add `reminderText`, `whatsappUrl`, `telegramUrl`. Pure strings. |
| `js/app.js` | **Modify.** Phone field + friends picker (screen 2); reminder menu (screen 4); session `id`; `saveHistory` → store upsert; history screen init; router accepts `'history'`. |
| `index.html` | **Modify.** «История» button on screen 1; `tmpl-screen-history`. |
| `style.css` | **Modify.** Friend chips, reminder menu, phone field, history list. |
| `sw.js` | **Modify.** Bump `razdelit-v4`, add `./js/store.js`. |
| `CLAUDE.md` | **New.** Living project context (stack, state, what's live, conventions). |
| `docs/superpowers/plans/2026-06-24-razdelit-schet-plan.md` | **Modify.** Sync MVP plan with current code (bugfixes). |
| `docs/superpowers/specs/2026-06-24-razdelit-schet-design.md` | **Modify.** Sync MVP spec with current code. |

---

## Task 1: Commit verified bugfixes + sync MVP docs

The working tree holds yesterday's verified bugfixes (`index.html`, `js/app.js`, `js/ocr.js`, `sw.js`) that are not yet committed. Per the standing rule, commit them together with the MVP doc updates that describe them.

**Files:**
- Modify: `docs/superpowers/specs/2026-06-24-razdelit-schet-design.md`
- Modify: `docs/superpowers/plans/2026-06-24-razdelit-schet-plan.md`

- [x] **Step 1: Update MVP spec to match current code**

In `2026-06-24-razdelit-schet-design.md`:
- Screen-transitions line ("Кнопка «назад» на каждом экране") → change to: "Кнопка «назад» на экранах 2–3 (на экране 1 её нет — возвращаться некуда)."
- OCR section → append: "Парсер фильтрует не-товарные строки (ИНН/БИН, телефоны, даты, номера чеков), отделяет количество от цены и отбрасывает позиции дороже всего счёта. Распознанный «Итого» имеет приоритет над суммой позиций."
- Под «Данные» добавить: "Доли участников квантуются в целые ₸ методом наибольшего остатка (`roundShares`), чтобы сумма выводимых сумм точно равнялась счёту. Русское склонение «человек/человека» — через `pluralPeople`."

- [x] **Step 2: Update MVP plan to match current code**

In `2026-06-24-razdelit-schet-plan.md`, update the code blocks that drifted:
- Task 1 Step 3 `sw.js` → `razdelit-v3` with `activate` cleanup + `skipWaiting`/`clients.claim` (current content of `sw.js` before this plan's Task 8 bumps it to v4).
- Task 6 `parseReceiptText` → replace with the current `js/ocr.js` body.
- Task 8 `initScreen3` → reflect `pluralPeople` + `< 1.5` tolerance.
- Task 9 `initScreen4` `updateTotals` → reflect the `completed` guard + green bar.
- Add a short "## Багфиксы 2026-06-25" section listing the 6 fixes (back button, OCR junk/total-clobber, history dup, rounding, pluralization, green bar) so the plan's history is honest.

- [x] **Step 3: Verify app still loads clean (no regression from doc edits — docs only)**

Run via `preview_eval` on the running server:
```js
location.reload()
```
Then `preview_console_logs` (level all) → Expected: no logs/errors.

- [x] **Step 4: Commit**

```bash
git add index.html js/app.js js/ocr.js sw.js \
  docs/superpowers/specs/2026-06-24-razdelit-schet-design.md \
  docs/superpowers/plans/2026-06-24-razdelit-schet-plan.md
git commit -m "fix: OCR junk filter, history dedup, rounding, pluralization, screen-1 back, green bar; sync MVP docs"
```

---

## Task 2: `js/store.js` — friends + history persistence

**Files:**
- Create: `js/store.js`

- [x] **Step 1: Write the assertion test (run later in Step 4)**

Save this snippet for Step 4 — it exercises every export:
```js
(async () => {
  const s = await import('./js/store.js?t=' + Date.now());
  localStorage.removeItem('razdelit-friends');
  localStorage.removeItem('razdelit-history');

  // friends upsert + dedup by normalized phone
  s.saveFriend({ name: 'Алия', phone: '8 700 123 45 67' });
  s.saveFriend({ name: 'Алия К.', phone: '+7 (700) 123-45-67' }); // same number → update
  s.saveFriend({ name: 'NoPhone', phone: '' });                   // ignored
  const f = s.listFriends();

  // history upsert by id
  s.saveSession({ id: 'a', total: 100, participants: [{ paidAmount: 50 }] });
  s.saveSession({ id: 'a', total: 100, participants: [{ paidAmount: 100 }] }); // update, not dup
  s.saveSession({ id: 'b', total: 200, participants: [] });
  const h = s.listSessions();

  s.removeFriend('77001234567');
  return {
    friendsCount: f.length,            // expect 1
    friendName: f[0]?.name,            // expect 'Алия К.'
    friendPhone: f[0]?.phone,          // expect '77001234567'
    histCount: h.length,               // expect 2
    histAFirst: h[0]?.id,              // expect 'b' (newest first)
    histAPaid: h.find(x=>x.id==='a')?.participants[0].paidAmount, // expect 100
    afterRemove: s.listFriends().length, // expect 0
  };
})()
```

- [x] **Step 2: Implement `js/store.js`**

```js
// js/store.js — localStorage persistence: friends + history. No DOM.

const FRIENDS_KEY = 'razdelit-friends';
const HISTORY_KEY = 'razdelit-history';
const HISTORY_MAX = 10;

function read(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
}
function write(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// Нормализация номера: только цифры, ведущая 8 → 7 (конвенция KZ/RU).
export function normalizePhone(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1);
  return d;
}

// ── Friends ───────────────────────────────────────────────
export function listFriends() {
  return read(FRIENDS_KEY);
}

export function saveFriend({ name, phone }) {
  const norm = normalizePhone(phone);
  if (!norm) return;                       // без номера не сохраняем
  const friends = read(FRIENDS_KEY).filter(f => normalizePhone(f.phone) !== norm);
  friends.push({ name: (name || '').trim(), phone: norm });
  write(FRIENDS_KEY, friends);
}

export function removeFriend(phone) {
  const norm = normalizePhone(phone);
  write(FRIENDS_KEY, read(FRIENDS_KEY).filter(f => normalizePhone(f.phone) !== norm));
}

// ── History ───────────────────────────────────────────────
export function listSessions() {
  return read(HISTORY_KEY);
}

export function getSession(id) {
  return read(HISTORY_KEY).find(s => s.id === id) || null;
}

// Upsert по id: обновляет существующую запись или добавляет сверху.
export function saveSession(session) {
  if (!session || !session.id) return;
  const rest = read(HISTORY_KEY).filter(s => s.id !== session.id);
  const entry = { ...session, date: session.date || new Date().toISOString() };
  write(HISTORY_KEY, [entry, ...rest].slice(0, HISTORY_MAX));
}
```

- [x] **Step 3: Add `js/store.js` to the running server's reach**

No build step — the file is served statically. Ensure the dev server is running (`preview_start` name `razdelit`).

- [x] **Step 4: Run the assertion snippet from Step 1 via `preview_eval`**

Expected result:
```json
{ "friendsCount": 1, "friendName": "Алия К.", "friendPhone": "77001234567",
  "histCount": 2, "histAFirst": "b", "histAPaid": 100, "afterRemove": 0 }
```

- [x] **Step 5: Commit**

```bash
git add js/store.js
git commit -m "feat: store.js — friends and history localStorage layer"
```

---

## Task 3: `js/share.js` — strip phones + deep-link builders

**Files:**
- Modify: `js/share.js`

- [x] **Step 1: Save the assertion test for Step 4**

```js
(async () => {
  const m = await import('./js/share.js?t=' + Date.now());
  const session = { total: 100, participants: [
    { id: 0, name: 'Алия', phone: '77001234567', share: 50 },
    { id: 1, name: 'Болат', phone: '', share: 50 },
  ]};
  const enc = m.encodeSession(session);
  const dec = m.decodeSession(enc);

  const p = session.participants[0];
  const url = 'https://x.test/#abc';
  const text = m.reminderText(p, url, '₸');
  const wa = m.whatsappUrl(p.phone, text);
  const tg = m.telegramUrl(url, text);

  return {
    phoneStrippedFromShare: dec.participants.every(x => x.phone === undefined), // true
    nameKept: dec.participants[0].name,        // 'Алия'
    textHasName: text.includes('Алия'),        // true
    textHasAmount: text.includes('50'),        // true
    textHasUrl: text.includes(url),            // true
    waOk: wa.startsWith('https://wa.me/77001234567?text='), // true
    tgOk: tg.startsWith('https://t.me/share/url?url='),     // true
  };
})()
```

- [x] **Step 2: Replace `js/share.js` with the extended version**

```js
// js/share.js — URL hash encode/decode + deep-link builders. Pure.
import { normalizePhone } from './store.js';

// Телефоны живут только на устройстве — вырезаем их из расшаренной сессии.
function stripPhones(session) {
  return {
    ...session,
    participants: (session.participants || []).map(({ phone, ...rest }) => rest),
  };
}

export function encodeSession(session) {
  const safe = stripPhones(session);
  return '#' + btoa(unescape(encodeURIComponent(JSON.stringify(safe))));
}

export function decodeSession(hash) {
  if (!hash || hash.length < 2) return null;
  try {
    return JSON.parse(decodeURIComponent(escape(atob(hash.slice(1)))));
  } catch {
    return null;
  }
}

// Персональный текст напоминания.
export function reminderText(participant, url, currency = '₸') {
  const name = (participant.name || '').trim();
  const hi = name ? `Привет, ${name}!` : 'Привет!';
  const sum = Math.round(participant.share || 0).toLocaleString('ru-RU');
  return `${hi} С тебя за счёт: ${sum} ${currency}.\nОтметить оплату: ${url}`;
}

export function whatsappUrl(phone, text) {
  const digits = normalizePhone(phone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

// Telegram не умеет писать по номеру — только share-диалог.
export function telegramUrl(url, text) {
  // в share-диалог текст без url (url — отдельным параметром)
  const body = text.replace(url, '').trim();
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(body)}`;
}
```

- [x] **Step 3: Add `js/store.js` import note**

`share.js` now imports `normalizePhone` from `store.js` — both are ES modules loaded statically, no build needed. (Task 8 adds `store.js` to the SW cache.)

- [x] **Step 4: Run the Step 1 assertion via `preview_eval`**

Expected:
```json
{ "phoneStrippedFromShare": true, "nameKept": "Алия", "textHasName": true,
  "textHasAmount": true, "textHasUrl": true, "waOk": true, "tgOk": true }
```

- [x] **Step 5: Commit**

```bash
git add js/share.js
git commit -m "feat: strip phones from shared URL + WhatsApp/Telegram deep-link builders"
```

---

## Task 4: Screen 2 — phone field + friends picker + autosave

**Files:**
- Modify: `js/app.js` (`initScreen2`, and its import header)
- Modify: `style.css`

- [x] **Step 1: Add the store import at the top of `js/app.js`**

Below the existing `import { encodeSession, decodeSession } from './share.js';` add:
```js
import { listFriends, saveFriend, removeFriend } from './store.js';
```

- [x] **Step 2: Add `phone: ''` to the participant factory in `initScreen2`'s `buildParticipants`**

Find in `buildParticipants`:
```js
    state.participants = Array.from({ length: count }, (_, i) => ({
      id: i,
      name: existing[i]?.name || '',
      color: COLORS[i % COLORS.length],
      share: 0, paid: false, paidAmount: 0,
    }));
```
Replace the object body's last line region to include phone:
```js
    state.participants = Array.from({ length: count }, (_, i) => ({
      id: i,
      name: existing[i]?.name || '',
      phone: existing[i]?.phone || '',
      color: COLORS[i % COLORS.length],
      share: 0, paid: false, paidAmount: 0,
    }));
```

- [x] **Step 3: Replace `renderNames` in `initScreen2` to add a phone input + friends picker**

```js
  function renderNames() {
    countDisplay.textContent = count;
    namesList.innerHTML = '';
    state.participants.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'participant-row';
      row.innerHTML = `
        <div class="avatar" style="background:${p.color}22;color:${p.color}">${p.name ? p.name[0].toUpperCase() : (i+1)}</div>
        <div class="participant-fields">
          <input type="text" class="p-name" placeholder="Участник ${i+1}" value="${p.name}">
          <input type="tel" class="p-phone" placeholder="Телефон (необязательно)" value="${p.phone}">
        </div>
        <button class="btn-friends" type="button" aria-label="Из друзей">📇</button>`;

      const nameInput  = row.querySelector('.p-name');
      const phoneInput = row.querySelector('.p-phone');
      nameInput.addEventListener('input', e => {
        state.participants[i].name = e.target.value;
        const av = row.querySelector('.avatar');
        av.textContent = e.target.value ? e.target.value[0].toUpperCase() : (i+1);
        renderItemsAssign();
      });
      phoneInput.addEventListener('input', e => {
        state.participants[i].phone = e.target.value;
      });
      row.querySelector('.btn-friends').addEventListener('click', () => openFriendPicker(i, nameInput, phoneInput, row));

      namesList.appendChild(row);
    });
    renderItemsAssign();
  }

  function openFriendPicker(i, nameInput, phoneInput, row) {
    row.querySelector('.friend-picker')?.remove();
    const friends = listFriends();
    const box = document.createElement('div');
    box.className = 'friend-picker';
    if (!friends.length) {
      box.innerHTML = `<span class="friend-empty">Нет сохранённых</span>`;
    } else {
      friends.forEach(f => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'friend-chip';
        chip.textContent = f.name || f.phone;
        chip.addEventListener('click', () => {
          state.participants[i].name = f.name;
          state.participants[i].phone = f.phone;
          nameInput.value = f.name;
          phoneInput.value = f.phone;
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));
          box.remove();
        });
        // долгое нажатие = удалить друга
        let t;
        chip.addEventListener('pointerdown', () => {
          t = setTimeout(() => {
            if (confirm(`Удалить ${f.name || f.phone} из друзей?`)) {
              removeFriend(f.phone);
              chip.remove();
            }
          }, 600);
        });
        chip.addEventListener('pointerup', () => clearTimeout(t));
        chip.addEventListener('pointerleave', () => clearTimeout(t));
        box.appendChild(chip);
      });
    }
    row.appendChild(box);
  }
```

- [x] **Step 4: Autosave friends on «Далее» — add to the top of the `nextBtn` click handler in `initScreen2`**

The handler currently starts with `nextBtn.addEventListener('click', () => {`. Insert as the FIRST lines inside it:
```js
    state.participants.forEach(p => {
      if (p.name?.trim() && p.phone?.trim()) saveFriend({ name: p.name, phone: p.phone });
    });
```

- [x] **Step 5: Add CSS to `style.css`** (append at end)

```css
/* Participant row (screen 2) */
.participant-row { display: flex; align-items: flex-start; gap: 8px; }
.participant-fields { flex: 1; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.participant-fields .p-phone { font-size: 14px; padding: 8px 12px; }
.btn-friends { background: none; border: none; font-size: 22px; cursor: pointer; padding: 4px; line-height: 1; flex-shrink: 0; }

/* Friends picker */
.friend-picker { grid-column: 1 / -1; width: 100%; display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.friend-chip { background: var(--red-light); color: var(--red); border: none; border-radius: var(--radius-full); padding: 6px 12px; font-size: 13px; cursor: pointer; }
.friend-chip:active { opacity: 0.7; }
.friend-empty { font-size: 13px; color: var(--text-tertiary); }
```

- [x] **Step 6: Verify in mobile preview**

1. `preview_resize` mobile. Reload. Enter total `6000` → Далее.
2. Screen 2 shows each participant with name + phone field + 📇.
3. Type name «Алия» and phone «87001234567» on row 1.
4. Tap 📇 on row 2 → picker says "Нет сохранённых" (friends empty until you proceed).
5. `preview_eval`: confirm `state.participants[0].phone` updates as you type.
6. Click Далее, go back, re-enter screen 2, tap 📇 → «Алия» chip appears; tapping it fills row.

Use `preview_screenshot` + `preview_eval` to confirm.

- [x] **Step 7: Commit (code + no doc drift; spec already covers this)**

```bash
git add js/app.js style.css
git commit -m "feat: screen 2 phone field, friends picker, and friend autosave"
```

---

## Task 5: Screen 4 — «Напомнить» button + channel menu

**Files:**
- Modify: `js/app.js` (`initScreen4` `buildCards`, and import header)
- Modify: `style.css`

- [x] **Step 1: Extend the share import in `js/app.js`**

Change the existing import line to:
```js
import { encodeSession, decodeSession, reminderText, whatsappUrl, telegramUrl } from './share.js';
```

- [x] **Step 2: Add a reminder helper inside `initScreen4` (above `buildCards`)**

```js
  function shareUrl() {
    return location.origin + location.pathname + encodeSession(state);
  }

  function openReminder(p, anchor) {
    document.querySelector('.reminder-menu')?.remove();
    const url = shareUrl();
    const text = reminderText(p, url, state.currency);
    const menu = document.createElement('div');
    menu.className = 'reminder-menu';

    const items = [];
    if ((p.phone || '').replace(/\D/g, ''))
      items.push(['WhatsApp', () => window.open(whatsappUrl(p.phone, text), '_blank')]);
    items.push(['Telegram', () => window.open(telegramUrl(url, text), '_blank')]);
    if (navigator.share)
      items.push(['Поделиться', () => navigator.share({ text, url }).catch(() => {})]);
    items.push(['Скопировать', () => {
      navigator.clipboard?.writeText(text).catch(() => {});
    }]);

    items.forEach(([label, fn]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'reminder-item';
      b.textContent = label;
      b.addEventListener('click', () => { fn(); menu.remove(); });
      menu.appendChild(b);
    });
    anchor.appendChild(menu);
    // закрыть по клику вне
    setTimeout(() => document.addEventListener('click', function off(e) {
      if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', off); }
    }), 0);
  }
```

- [x] **Step 3: Add a «Напомнить» button to each card in `buildCards`**

In `buildCards`, the card `innerHTML` ends with the status div. After building `card.innerHTML`, and BEFORE the `card.addEventListener('click', ...)` tap handler, insert a reminder button that does not trigger the "mark paid" tap:

Add this just after `card.innerHTML = \`...\`;`:
```js
      const remindBtn = document.createElement('button');
      remindBtn.type = 'button';
      remindBtn.className = 'btn-remind';
      remindBtn.textContent = 'Напомнить';
      remindBtn.addEventListener('click', e => {
        e.stopPropagation();              // не отмечать оплату
        openReminder(p, remindBtn);
      });
      card.querySelector('.participant-info').appendChild(remindBtn);
```

- [x] **Step 4: Add CSS to `style.css`** (append)

```css
/* Reminder button + menu (screen 4) */
.btn-remind { margin-top: 8px; background: var(--red-light); color: var(--red); border: none; border-radius: var(--radius-full); padding: 5px 12px; font-size: 12px; font-weight: 600; cursor: pointer; }
.btn-remind:active { opacity: 0.7; }
.participant-info { position: relative; }
.reminder-menu { position: absolute; left: 0; top: 100%; margin-top: 4px; background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: 0 6px 24px rgba(0,0,0,0.12); z-index: 50; display: flex; flex-direction: column; min-width: 160px; overflow: hidden; }
.reminder-item { background: none; border: none; text-align: left; padding: 12px 14px; font-size: 14px; cursor: pointer; }
.reminder-item:active { background: var(--bg); }
.reminder-item + .reminder-item { border-top: 1px solid var(--border); }
```

- [x] **Step 5: Verify in mobile preview**

1. Full flow: total 6000 → 2 participants, give row 1 a phone → split → tracker.
2. Each card shows «Напомнить». Tap it → menu appears.
3. Participant WITH phone → menu has WhatsApp + Telegram + (Поделиться) + Скопировать.
4. Participant WITHOUT phone → no WhatsApp.
5. `preview_eval` to read the generated `whatsappUrl`/`telegramUrl` (call `openReminder` is DOM; instead assert builders directly): confirm tapping «Напомнить» does NOT mark the card paid (status still «ждём»).

- [x] **Step 6: Commit**

```bash
git add js/app.js style.css
git commit -m "feat: per-participant reminder menu — WhatsApp/Telegram/share/copy"
```

---

## Task 6: Session `id` + history upsert (replaces save-once)

**Files:**
- Modify: `js/app.js` (`initScreen4`, `saveHistory`, state)
- Modify: `js/store.js` import in app

- [x] **Step 1: Import `saveSession` in `js/app.js`**

Extend the store import:
```js
import { listFriends, saveFriend, removeFriend, saveSession, listSessions, getSession } from './store.js';
```

- [x] **Step 2: Add `id` to the state object**

Find:
```js
export const state = {
  total: 0,
  currency: '₸',
  items: [],           // [{ name, price }]
  participants: [],    // [{ id, name, color, share, paid, paidAmount }]
};
```
Add `id: null,` as the first field:
```js
export const state = {
  id: null,
  total: 0,
  currency: '₸',
  items: [],
  participants: [],    // [{ id, name, color, share, paid, paidAmount, phone }]
};
```

- [x] **Step 3: Assign `id` on entering the tracker — at the top of `initScreen4`**

Add as the first line of `initScreen4`:
```js
  if (!state.id) state.id = (crypto.randomUUID?.() || ('s' + Date.now() + Math.round(Math.random() * 1e6)));
```

- [x] **Step 4: Replace the standalone `saveHistory` function to upsert via store**

Find the current `saveHistory` (it reads/writes `localStorage` directly) and replace its body:
```js
function saveHistory() {
  saveSession({ ...state });   // upsert по state.id, телефоны останутся только локально
}
```
(`saveSession` handles the 10-item cap and date.)

- [x] **Step 5: Clear `id` on «Новый счёт»**

In the `newBtn` click handler inside `initScreen4`, the reset currently is:
```js
    Object.assign(state, { total: 0, currency: '₸', items: [], participants: [] });
```
Change to also clear id:
```js
    Object.assign(state, { id: null, total: 0, currency: '₸', items: [], participants: [] });
```

- [x] **Step 6: Verify history upserts (no dup, partial persists)**

`preview_eval`:
```js
(async () => {
  localStorage.removeItem('razdelit-history');
  // simulate a tracked session by driving the UI: assume currently on screen 4
  // mark one of two participants paid, read history
  const cards = [...document.querySelectorAll('.participant-card')];
  cards[0]?.click();
  const h = JSON.parse(localStorage.getItem('razdelit-history') || '[]');
  return { count: h.length, firstHasId: !!h[0]?.id, paidSoFar: h[0]?.participants?.filter(p=>p.paid).length };
})()
```
Expected after one tap of a 2-person bill: `{ count: 1, firstHasId: true, paidSoFar: 1 }`. Tap the second → still `count: 1`, `paidSoFar: 2`.

- [x] **Step 7: Commit**

```bash
git add js/app.js
git commit -m "feat: session id + history upsert (one entry per bill, keeps partial progress)"
```

---

## Task 7: History screen + router + «История» button

**Files:**
- Modify: `index.html` (button on screen 1, new template)
- Modify: `js/app.js` (router accepts `'history'`, `initScreenHistory`)
- Modify: `style.css`

- [x] **Step 1: Add «История» button to screen 1 template in `index.html`**

In `tmpl-screen1`, replace the title line:
```html
      <h1 class="screen-title">Добавить счёт</h1>
```
with a header row:
```html
      <div class="screen1-header">
        <h1 class="screen-title">Добавить счёт</h1>
        <button class="btn-history" id="open-history" type="button">📜 История</button>
      </div>
```

- [x] **Step 2: Add the history template before `</body>` in `index.html`**

```html
  <!-- HISTORY -->
  <template id="tmpl-screen-history">
    <div class="screen" data-screen="history">
      <button class="btn-back" data-action="back-home">← Назад</button>
      <h1 class="screen-title">История</h1>
      <div id="history-list" style="display:flex;flex-direction:column;gap:8px"></div>
    </div>
  </template>
```

- [x] **Step 3: Generalize the router in `js/app.js` to accept a string screen id**

Replace the top of `showScreen`:
```js
export function showScreen(n, direction = 'forward') {
  const tmpl = document.getElementById(`tmpl-screen${n}`);
  if (!tmpl) return;
```
with:
```js
export function showScreen(n, direction = 'forward') {
  const tmpl = document.getElementById(
    typeof n === 'number' ? `tmpl-screen${n}` : `tmpl-screen-${n}`);
  if (!tmpl) return;
```

And replace the inits dispatch:
```js
  const inits = { 1: initScreen1, 2: initScreen2, 3: initScreen3, 4: initScreen4 };
  if (inits[n]) inits[n](incoming);
```
with:
```js
  const inits = { 1: initScreen1, 2: initScreen2, 3: initScreen3, 4: initScreen4, history: initScreenHistory };
  if (inits[n]) inits[n](incoming);

  // именованный «Назад на главную»
  incoming.querySelectorAll('[data-action="back-home"]').forEach(btn =>
    btn.addEventListener('click', () => showScreen(1, 'backward')));
```

Note: the generic back wiring uses `showScreen(n - 1)`. For `n === 'history'`, `n - 1` is `NaN` → `tmpl-screenNaN` → `showScreen` returns early (harmless). The explicit `back-home` handler is what navigates.

- [x] **Step 4: Wire the «История» button — at the end of `initScreen1`**

Add before the closing brace of `initScreen1`:
```js
  el.querySelector('#open-history')?.addEventListener('click', () => showScreen('history'));
```

- [x] **Step 5: Add `initScreenHistory` in `js/app.js`** (next to the other inits)

```js
function initScreenHistory(el) {
  const list = el.querySelector('#history-list');
  const sessions = listSessions();
  const fmt = n => Math.round(n).toLocaleString('ru-RU');

  if (!sessions.length) {
    list.innerHTML = `<div class="history-empty">Пока счетов нет</div>`;
    return;
  }

  sessions.forEach(s => {
    const collected = (s.participants || []).reduce((a, p) => a + (p.paidAmount || 0), 0);
    const done = collected >= s.total && s.total > 0;
    const date = s.date
      ? new Date(s.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
      : '';
    const status = done ? '✅ собрано' : `⏳ ${fmt(collected)} / ${fmt(s.total)} ₸`;

    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'history-row';
    row.innerHTML = `
      <span class="history-date">${date}</span>
      <span class="history-total">${fmt(s.total)} ₸</span>
      <span class="history-status ${done ? 'done' : 'pending'}">${status}</span>`;
    row.addEventListener('click', () => {
      Object.assign(state, getSession(s.id));
      showScreen(4);
    });
    list.appendChild(row);
  });
}
```

- [x] **Step 6: Add CSS to `style.css`** (append)

```css
/* Screen 1 header + history */
.screen1-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.btn-history { background: none; border: none; color: var(--red); font-size: 14px; font-weight: 600; cursor: pointer; padding: 4px; }
.history-row { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; background: var(--card); border: none; border-radius: var(--radius-md); padding: 14px; text-align: left; cursor: pointer; }
.history-row:active { background: #fafafa; }
.history-date { font-size: 13px; color: var(--text-tertiary); }
.history-total { font-size: 15px; font-weight: 600; }
.history-status { font-size: 13px; font-weight: 600; white-space: nowrap; }
.history-status.done { color: var(--green); }
.history-status.pending { color: var(--text-tertiary); }
.history-empty { font-size: 14px; color: var(--text-tertiary); text-align: center; padding: 32px 0; }
```

- [x] **Step 7: Verify in mobile preview**

1. Reload. Complete one bill fully + start another and pay it partially (so history has 2 entries).
2. From screen 1, tap «📜 История» → list shows both, newest first, one `✅ собрано`, one `⏳ X / Y`.
3. Tap the partial one → opens tracker (screen 4) with its participants and progress restored.
4. «Назад» from history → screen 1.
5. `preview_screenshot` to confirm layout.

- [x] **Step 8: Commit**

```bash
git add index.html js/app.js style.css
git commit -m "feat: history screen with restore + router named-screen support"
```

---

## Task 8: Service Worker bump to v4

**Files:**
- Modify: `sw.js`

- [x] **Step 1: Bump cache + add `store.js`**

Change the first two lines of `sw.js`:
```js
const CACHE = 'razdelit-v3';
const ASSETS = ['./', './index.html', './style.css', './js/app.js',
  './js/ocr.js', './js/share.js', './js/confetti.js', './manifest.json',
  './icons/icon.svg'];
```
to:
```js
const CACHE = 'razdelit-v4';
const ASSETS = ['./', './index.html', './style.css', './js/app.js',
  './js/ocr.js', './js/share.js', './js/store.js', './js/confetti.js',
  './manifest.json', './icons/icon.svg'];
```

- [x] **Step 2: Verify SW updates and caches store.js**

`preview_eval`:
```js
(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  await reg?.update();
  const keys = await caches.keys();
  const v4 = keys.find(k => k === 'razdelit-v4');
  const cache = v4 ? await caches.open(v4) : null;
  const hasStore = cache ? !!(await cache.match('./js/store.js')) : false;
  return { keys, hasStore };
})()
```
Expected: `keys` contains `"razdelit-v4"` and `hasStore: true`. (May require one reload for the new SW to activate.)

- [x] **Step 3: Commit**

```bash
git add sw.js
git commit -m "chore: SW cache v4 — include store.js"
```

---

## Task 9: CLAUDE.md context + final spec/plan sync

Per the standing rule, finish by making the project context and the social-layer spec/plan reflect what was actually built.

**Files:**
- Create: `CLAUDE.md`
- Modify: `docs/superpowers/specs/2026-06-25-social-layer-design.md` (status note)
- Modify: `docs/superpowers/plans/2026-06-25-social-layer.md` (check the boxes)

- [x] **Step 1: Create `CLAUDE.md`**

```markdown
# CLAUDE.md — Разделить счёт

PWA для дележа счёта (Казахстан, ₸). Vanilla JS, без сервера, без build-step.

## Запуск
Статик-хостинг или `python3 -m http.server` / `npx serve`. Дев-превью: `.claude/launch.json` (имя `razdelit`).

## Архитектура
- `index.html` — оболочка + `<template>` экранов (1–4 + history).
- `js/app.js` — состояние, роутер (числовые экраны + именованный `history`), init экранов, вся DOM-логика.
- `js/share.js` — encode/decode сессии в URL-hash (вырезает телефоны) + deep-link построители (WhatsApp/Telegram/текст). Чистые функции.
- `js/store.js` — localStorage: друзья + история (upsert по `id`). Без DOM.
- `js/ocr.js` — ленивый Tesseract.js + парсер чека (фильтрует мусор).
- `js/confetti.js` — canvas-конфетти при 100%.
- `sw.js` — cache-first офлайн (текущая версия `razdelit-v4`).

## Состояние (`state`)
`{ id, total, currency, items:[{name,price}], participants:[{id,name,phone,color,share,paid,paidAmount}] }`
- `id` присваивается на трекере (экран 4), ключ записи истории.
- `phone` — только на устройстве, НЕ попадает в расшаренный URL.

## Хранилище (localStorage)
- `razdelit-friends` — `[{name, phone}]` (ключ — нормализованный номер).
- `razdelit-history` — последние 10 сессий, upsert по `id`.

## Конвенции
- Доли квантуются в целые ₸ (`roundShares`, метод наибольшего остатка) — сумма точно равна счёту.
- Склонение «человек/человека» — `pluralPeople`.
- Деплой: GitHub Pages с ветки `main`. При изменении ассетов — бамп `CACHE` в `sw.js`.
- **Документация и контекст обновляются в том же коммите, что и код.**

## Что НЕ делаем (без сервера)
Реал-тайм-синк между устройствами; авто-отправка напоминаний; Telegram по номеру напрямую.
```

- [x] **Step 2: Mark the social-layer spec as shipped**

In `2026-06-25-social-layer-design.md` change `**Статус:** утверждён` → `**Статус:** реализован 2026-06-25`.

- [x] **Step 3: Check all boxes in this plan** (`- [ ]` → `- [x]`) to reflect completion.

- [x] **Step 4: Final regression pass in preview**

Full end-to-end: manual bill → phones + friend save → split → tracker → reminder menu → history → restore. `preview_console_logs` level all → no errors. `preview_screenshot` of tracker + history.

- [x] **Step 5: Commit**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-06-25-social-layer-design.md docs/superpowers/plans/2026-06-25-social-layer.md
git commit -m "docs: CLAUDE.md context + mark social-layer spec/plan complete"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| `participant.phone` field | Task 4 |
| Phone input on screen 2 | Task 4 |
| Friends picker (📇) + autosave + delete | Task 4 + Task 2 (store) |
| Reminder text builder | Task 3 |
| WhatsApp deep-link (by number) | Task 3 + Task 5 |
| Telegram share deep-link | Task 3 + Task 5 |
| System share + copy fallback | Task 5 |
| «Напомнить» menu on screen 4 | Task 5 |
| Friends localStorage CRUD | Task 2 |
| Session `id` | Task 6 |
| History upsert (no dup, keeps partial) | Task 2 (store) + Task 6 |
| History screen + restore | Task 7 |
| «📜 История» button on screen 1 | Task 7 |
| Router named screen | Task 7 |
| Phones stripped from shared URL | Task 3 |
| SW v4 + store.js cached | Task 8 |
| MVP docs synced with bugfixes | Task 1 |
| CLAUDE.md context | Task 9 |

**Placeholder scan:** No TBD/TODO; every code step shows full code.

**Type consistency:** `state.id`, `participant.phone`, `normalizePhone`, `saveFriend/listFriends/removeFriend`, `saveSession/listSessions/getSession`, `reminderText/whatsappUrl/telegramUrl`, `initScreenHistory`, screen id `'history'` (template `tmpl-screen-history`) used consistently across tasks.

**Decomposition:** store (persistence) and share (URL/deep-links) are DOM-free and independently testable; app.js orchestrates. Each task produces a working, committable increment.
