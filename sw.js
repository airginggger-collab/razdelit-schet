const CACHE = 'razdelit-v4';
const ASSETS = ['./', './index.html', './style.css', './js/app.js',
  './js/ocr.js', './js/share.js', './js/store.js', './js/confetti.js',
  './manifest.json', './icons/icon.svg'];

self.addEventListener('install', e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));

self.addEventListener('activate', e =>
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())));

self.addEventListener('fetch', e =>
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
