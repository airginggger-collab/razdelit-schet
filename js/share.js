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
