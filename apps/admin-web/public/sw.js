const CACHE_NAME = 'nc-admin-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/branding/favicon.png',
  '/branding/icon-192.png',
  '/branding/icon-512.png',
  '/branding/icon-maskable-192.png',
  '/branding/icon-maskable-512.png',
  '/branding/nc-logo.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass non-GET and API / dynamic proxy requests
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // Cache-first for static branding & images
  if (url.pathname.startsWith('/branding/') || url.pathname.endsWith('.png') || url.pathname.endsWith('.ico') || url.pathname.endsWith('.jpg')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first with cache fallback for pages
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request).then((cached) => {
        if (cached) return cached;
        if (request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/');
        }
      });
    })
  );
});
