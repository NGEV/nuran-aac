/* Nuran AAC — service worker.
   Cache-first app shell so everything opens with no connection (spec 2.4).
   Bump CACHE_VERSION when shipping changes. */

const CACHE_VERSION = 'nuran-v24';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './visual-system.css',
  './nuran-real-photos.js',
  './real-photos/apple.png',
  './real-photos/ball.png',
  './real-photos/banana.png',
  './real-photos/blocks.png',
  './real-photos/bread.png',
  './real-photos/cookie.png',
  './real-photos/milk.png',
  './real-photos/water.png',
  './core/symbol-registry.js',
  './core/settings.js',
  './core/curriculum.js',
  './core/activity-registry.js',
  './core/platform.js',
  './features/activity-catalog.js',
  './db.js',
  './speech.js',
  './seed.js',
  './app.js',
  './manifest.webmanifest',
  './PHOTO_CREDITS.md',
  './nuran-user-manual.pdf',
  './icon-192.png',
  './icon-512.png',
  './lucide.js',
  './fonts/AtkinsonHyperlegible-Regular.woff2',
  './fonts/AtkinsonHyperlegible-Bold.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit =>
      hit || fetch(e.request).then(res => {
        // opportunistically refresh the cache when online
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => e.request.mode === 'navigate'
        ? caches.match('./index.html')
        : Response.error())
    )
  );
});
