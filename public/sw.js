const CACHE_NAME = 'spa-road-laundromat-v2';
const STATIC_ASSETS = ['/manifest.json', '/spard_logo.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Navigation requests (HTML): always network-first so new deploys are picked up
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }
  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
