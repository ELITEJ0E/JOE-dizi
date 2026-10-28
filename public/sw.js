const CACHE_NAME = 'joe-dizi-shell-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/dizi-192.png', '/icons/dizi-512.png', '/icons/dizi-maskable-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(async keys => {
    await Promise.all(keys.filter(key => key.startsWith('joe-dizi-shell-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  }));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.match('/index.html')) || Response.error()));
    return;
  }

  // Cache same-origin app resources only; audio streams and API responses remain live.
  if (!/\.(?:js|css|png|svg|woff2?|webmanifest|html)$/.test(url.pathname)) return;
  event.respondWith(caches.match(request).then(cached => {
    if (cached) return cached;
    return fetch(request).then(response => {
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        void caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    });
  }));
});
