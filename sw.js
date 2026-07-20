/* Nuran AAC — service worker.
   Cache-first app shell so everything opens with no connection (spec 2.4).
   Bump CACHE_VERSION when shipping changes. */

const CACHE_VERSION = 'nuran-v18';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './visual-system.css',
  './symbols.js',
  './core/symbol-registry.js',
  './core/settings.js',
  './core/activity-registry.js',
  './core/platform.js',
  './features/activity-catalog.js',
  './db.js',
  './speech.js',
  './seed.js',
  './app.js',
  './manifest.webmanifest',
  './nuran-user-manual.pdf',
  './icon-192.png',
  './icon-512.png',
  './lucide.js',
  './fonts/AtkinsonHyperlegible-Regular.woff2',
  './fonts/AtkinsonHyperlegible-Bold.woff2',
  './mulberry-map.js',
  './mulberry/apple.svg',
  './mulberry/ball.svg',
  './mulberry/banana.svg',
  './mulberry/bathroom.svg',
  './mulberry/blocks.svg',
  './mulberry/bread.svg',
  './mulberry/bubbles.svg',
  './mulberry/calm.svg',
  './mulberry/car.svg',
  './mulberry/cold.svg',
  './mulberry/come.svg',
  './mulberry/cookie.svg',
  './mulberry/drink.svg',
  './mulberry/eat.svg',
  './mulberry/finished.svg',
  './mulberry/get.svg',
  './mulberry/give.svg',
  './mulberry/go.svg',
  './mulberry/good.svg',
  './mulberry/happy.svg',
  './mulberry/hello.svg',
  './mulberry/help.svg',
  './mulberry/home.svg',
  './mulberry/hot.svg',
  './mulberry/hug.svg',
  './mulberry/hungry.svg',
  './mulberry/i.svg',
  './mulberry/in.svg',
  './mulberry/juice.svg',
  './mulberry/look.svg',
  './mulberry/mad.svg',
  './mulberry/make.svg',
  './mulberry/milk.svg',
  './mulberry/more.svg',
  './mulberry/music.svg',
  './mulberry/on.svg',
  './mulberry/open.svg',
  './mulberry/outside.svg',
  './mulberry/park.svg',
  './mulberry/play.svg',
  './mulberry/put.svg',
  './mulberry/sad.svg',
  './mulberry/same.svg',
  './mulberry/scared.svg',
  './mulberry/school.svg',
  './mulberry/silly.svg',
  './mulberry/sit.svg',
  './mulberry/sleep.svg',
  './mulberry/snack.svg',
  './mulberry/some.svg',
  './mulberry/store.svg',
  './mulberry/swing.svg',
  './mulberry/thirsty.svg',
  './mulberry/turn.svg',
  './mulberry/tv.svg',
  './mulberry/up.svg',
  './mulberry/want.svg',
  './mulberry/wash.svg',
  './mulberry/water.svg',
  './mulberry/what.svg',
  './mulberry/when.svg',
  './mulberry/where.svg',
  './mulberry/who.svg',
  './mulberry/why.svg',
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
