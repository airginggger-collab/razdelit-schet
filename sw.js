const CACHE = 'razdelit-v1';
const ASSETS = ['./', './index.html', './style.css', './js/app.js',
  './js/ocr.js', './js/share.js', './js/confetti.js', './manifest.json',
  './icons/icon.svg'];

self.addEventListener('install', e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))));

self.addEventListener('fetch', e =>
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
