// js/app.js
import { encodeSession, decodeSession, reminderText, whatsappUrl, telegramUrl } from './share.js';
import { listFriends, saveFriend, removeFriend, saveSession, listSessions, getSession } from './store.js';

// ─── State ────────────────────────────────────────────────────────────────────
export const COLORS = [
  '#E8131E','#1D9E75','#7F77DD','#D85A30','#BA7517','#185FA5','#A32D2D','#3B6D11'
];

export const state = {
  id: null,
  total: 0,
  currency: '₸',
  items: [],           // [{ name, price }]
  participants: [],    // [{ id, name, phone, color, share, paid, paidAmount }]
};

// ─── Helpers ────────────────────────────────────────────────────────────────
// Русское склонение: 1 человек · 2 человека · 5 человек
export function pluralPeople(n) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return 'человек';
  if (b > 1 && b < 5) return 'человека';
  if (b === 1) return 'человек';
  return 'человек';
}

// Превращает дробные доли в целые тенге, сумма которых точно равна счёту
// (метод наибольшего остатка). Иначе три «33 ₸» давали бы 99 вместо 100.
export function roundShares(participants, total) {
  if (!participants.length) return participants;
  total = Math.round(total);
  // дробные части считаем ДО перезаписи долей
  const parts = participants.map((p, i) => ({
    i,
    floor: Math.floor(p.share),
    frac: p.share - Math.floor(p.share),
  }));
  let remainder = total - parts.reduce((a, p) => a + p.floor, 0);
  participants.forEach((p, i) => (p.share = parts[i].floor));
  // +1 ₸ тем, у кого дробная часть больше; при равенстве — старшим индексам,
  // чтобы участник №1 в заголовке показывал базовую (меньшую) сумму
  parts.sort((a, b) => b.frac - a.frac || b.i - a.i);
  for (let k = 0; k < remainder && k < parts.length; k++)
    participants[parts[k].i].share += 1;
  return participants;
}

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

  // force layout before removing enter class so CSS transition fires
  incoming.getBoundingClientRect();
  setTimeout(() => {
    incoming.classList.remove('enter-right', 'enter-left');
    incoming.classList.add('active');
  }, 16);

  currentScreen = incoming;
}

// ─── Screen inits ─────────────────────────────────────────────────────────────
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

  // OCR wiring (lazy)
  import('./ocr.js').then(({ recogniseReceipt }) => {
    const scanTrigger = el.querySelector('#scan-trigger');
    const cameraInput = el.querySelector('#camera-input');
    const ocrStatus   = el.querySelector('#ocr-status');

    scanTrigger.addEventListener('click', () => cameraInput.click());

    cameraInput.addEventListener('change', async () => {
      const file = cameraInput.files[0];
      if (!file) return;
      ocrStatus.style.display = 'block';
      try {
        const result = await recogniseReceipt(file, msg => ocrStatus.textContent = msg);
        if (result.items.length) {
          state.items = result.items;
          renderItems();
        }
        // распознанный «Итого» надёжнее суммы позиций (учитывает налог/сервис),
        // поэтому НЕ перезатираем его — иначе мусорные позиции ломали бы счёт
        if (result.total) {
          state.total = result.total;
        } else if (result.items.length) {
          state.total = result.items.reduce((a, b) => a + (b.price || 0), 0);
        }
        totalInput.value = state.total || '';
        nextBtn.disabled = state.total <= 0;
        ocrStatus.textContent = result.total || result.items.length
          ? `Распознано: ${state.total} ₸, ${result.items.length} позиций`
          : 'Не удалось распознать — введите вручную';
      } catch {
        ocrStatus.textContent = 'Не удалось распознать — введите вручную';
      }
    });
  });

  nextBtn.addEventListener('click', () => showScreen(2));

  renderItems();
  syncTotal();
}

function initScreen2(el) {
  let count = Math.max(state.participants.length, 2);
  const countDisplay    = el.querySelector('#count-display');
  const namesList       = el.querySelector('#names-list');
  const itemsAssignSec  = el.querySelector('#items-assign-section');
  const itemsAssignList = el.querySelector('#items-assign-list');
  const nextBtn         = el.querySelector('#s2-next');

  function buildParticipants() {
    const existing = state.participants;
    state.participants = Array.from({ length: count }, (_, i) => ({
      id: i,
      name: existing[i]?.name || '',
      phone: existing[i]?.phone || '',
      color: COLORS[i % COLORS.length],
      share: 0, paid: false, paidAmount: 0,
    }));
  }

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
    // автосохранение друзей с именем+номером
    state.participants.forEach(p => {
      if (p.name?.trim() && p.phone?.trim()) saveFriend({ name: p.name, phone: p.phone });
    });
    if (state.items.length) {
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
    // целые суммы, точно складывающиеся в счёт (без потери ₸ на округлении)
    roundShares(state.participants, state.total);
    state.total = Math.round(state.total);
    showScreen(3);
  });

  buildParticipants();
  renderNames();
}

function initScreen3(el) {
  const amountEl   = el.querySelector('#s3-amount');
  const noteEl     = el.querySelector('#s3-note');
  const headerEl   = el.querySelector('#s3-header');
  const itemsSec   = el.querySelector('#s3-items-section');
  const itemsList  = el.querySelector('#s3-items-list');
  const indivSec   = el.querySelector('#s3-individual-section');
  const indivList  = el.querySelector('#s3-individual-list');
  const nextBtn    = el.querySelector('#s3-next');

  const fmt = n => Math.round(n).toLocaleString('ru-RU');
  const n = state.participants.length;
  // ≤1 ₸ разницы — это остаток округления равного деления, а не разные суммы
  const allEqual = state.participants.every(p =>
    Math.abs(p.share - state.participants[0].share) < 1.5);

  if (allEqual) {
    headerEl.textContent = 'Каждый платит';
    amountEl.textContent = fmt(state.participants[0]?.share || 0) + ' ₸';
    noteEl.textContent = `из ${fmt(state.total)} ₸ · ${n} ${pluralPeople(n)}`;
    indivSec.style.display = 'none';
  } else {
    headerEl.textContent = 'Индивидуально';
    amountEl.textContent = fmt(state.total) + ' ₸';
    noteEl.textContent = `итого · ${n} ${pluralPeople(n)}`;
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

function initScreen4(el) {
  const collectedEl = el.querySelector('#s4-collected');
  const totalBar    = el.querySelector('#s4-total-bar');
  const pList       = el.querySelector('#s4-participants');
  const newBtn      = el.querySelector('#s4-new');
  const shareBtn    = el.querySelector('#share-btn');

  const fmt = n => Math.round(n).toLocaleString('ru-RU');
  let completed = false;   // чтобы конфетти/история сработали один раз за счёт

  function updateTotals() {
    const collected = state.participants.reduce((a, p) => a + p.paidAmount, 0);
    const pct = Math.min(100, (collected / state.total) * 100);
    collectedEl.textContent = `${fmt(collected)} / ${fmt(state.total)} ₸`;
    totalBar.style.width = pct + '%';
    totalBar.style.background = pct >= 100 ? 'var(--green)' : '';

    if (pct >= 100 && !completed) {
      completed = true;
      newBtn.style.display = 'block';
      import('./confetti.js').then(m => m.burst());
      saveHistory();   // одна запись на завершённый счёт
    }
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
      await navigator.clipboard.writeText(url).catch(() => prompt('Скопируй ссылку:', url));
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
  try {
    const history = JSON.parse(localStorage.getItem(key) || '[]');
    history.unshift({ ...state, date: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(history.slice(0, 10)));
  } catch {}
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
function boot() {
  if ('serviceWorker' in navigator)
    navigator.serviceWorker.register('./sw.js');

  const shared = decodeSession(location.hash);
  if (shared) {
    Object.assign(state, shared);
    showScreen(4);
  } else {
    showScreen(1);
  }
}

document.addEventListener('DOMContentLoaded', boot);
