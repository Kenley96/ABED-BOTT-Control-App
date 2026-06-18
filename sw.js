const CACHE_NAME = 'abed-bott-cache-v1';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',

  './css/variables.css',
  './css/base.css',
  './css/animations.css',
  './css/components.css',
  './css/dashboard.css',
  './css/layout.css',
  './css/splash.css',

  './js/app.js',
  './js/state-manager.js',
  './js/socket-service.js',
  './js/command-service.js',
  './js/drive-controls.js',
  './js/security-gate.js',
  './js/ui-controller.js',
  './js/error-handler.js',

  './assets/icon-32.png',
  './assets/icon-180.png',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => (key === CACHE_NAME ? null : caches.delete(key)))
    ))
    .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isNavigation = event.request.mode === 'navigate';

  // For this app we cache only the local app shell. Cross-origin requests (including the ESP32 LAN)
  // are left untouched so socket-service.js can still attempt direct requests to 192.168.4.1.
  const isLocalAsset = url.origin === location.origin;

  // App navigation: cache-first to ensure offline loads.
  if (isNavigation) {
    event.respondWith(
      caches.match('./index.html')
        .then((cached) => cached || fetch(event.request).catch(() => cached))
    );
    return;
  }

  // Cache-first for local app shell/static assets.
  if (isLocalAsset) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return fetch(event.request)
            .then((networkResponse) => {
              // Cache successful responses.
              if (networkResponse && networkResponse.status === 200) {
                const copy = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);
        })
    );
    return;
  }

  // Non-local requests: network-first (do not cache).
  // If offline, this will fail and socket-service.js will handle its own error state.
  event.respondWith(
    fetch(event.request).catch(() => {
      throw new Error('Network request failed (non-cached cross-origin)');
    })
  );
});

