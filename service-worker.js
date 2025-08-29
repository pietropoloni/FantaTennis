/* FantaTennis PWA — simple offline cache */
const CACHE_NAME = 'ft-cache-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './service-worker.js',
  './icons/apple-touch-icon1-180.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

/**
 * Strategy:
 *  - Same-origin requests: cache-first (for app shell)
 *  - Cross-origin (rankings via r.jina.ai): network-first, fallback to cache if present
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin) {
    // App shell: cache-first
    event.respondWith(
      caches.match(event.request).then((cached) =>
        cached || fetch(event.request).then((res) => {
          // Update cache
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
          return res;
        })
      )
    );
  } else {
    // Cross-origin: network-first with fallback
    event.respondWith(
      fetch(event.request).then((res) => {
        // Optionally cache cross-origin GETs (best-effort)
        if (event.request.method === 'GET' && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
        }
        return res;
      }).catch(() => caches.match(event.request))
    );
  }
});

