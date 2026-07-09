/* Nuran AAC — service worker.
   Cache-first app shell so everything opens with no connection (spec 2.4).
   Bump CACHE_VERSION when shipping changes. */

const CACHE_VERSION = 'nuran-v1';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './symbols.js',
  './db.js',
  './speech.js',
  './seed.js',
  './app.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
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
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() =>
        // never a blank screen offline: fall back to the shell
        caches.match('./index.html')
      )
    )
  );
});
