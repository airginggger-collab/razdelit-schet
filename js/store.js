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
