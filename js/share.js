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
