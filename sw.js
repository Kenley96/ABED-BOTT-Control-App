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
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Harden install: cache whatever we can. If one asset is missing,
    // cache.addAll would reject and fail the whole SW install.
    await Promise.all(
      CORE_ASSETS.map(async (asset) => {
        try {
          // Use absolute URL so the SW can resolve it reliably.
          const request = new Request(new URL(asset, self.location).toString(), {
            cache: 'reload'
          });
          const response = await fetch(request);
          if (response && response.status === 200) {
            await cache.put(request, response);
          }
        } catch (e) {
          // Ignore missing/unreachable assets during install.
          // Offline-first should still work for the rest of the shell.
        }
      })
    );

    await self.skipWaiting();
  })());
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

  const safeCacheMatch = async (req) => {
    // First try exact match.
    const exact = await caches.match(req);
    if (exact) return exact;

    // Then try a normalized pathname match for common app-shell requests.
    try {
      const pathname = new URL(req.url).pathname;
      const normalized = await caches.match(pathname);
      if (normalized) return normalized;
    } catch (_) {}

    return null;
  };

  // App navigation: stale-while-revalidate with offline fallback.
  if (isNavigation) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);

      // Prefer cached shell immediately.
      const cached = await cache.match('./index.html') || await cache.match('/index.html') || await safeCacheMatch(event.request);

      // Background refresh (best effort).
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })());
    return;
  }

  // Same-origin local assets: stale-while-revalidate.
  if (isLocalAsset) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);

      const cachedResponse = await safeCacheMatch(event.request);

      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      // Serve cache immediately if present.
      return cachedResponse || networkFetch;
    })());
    return;
  }

  // Non-local requests: network-only (do not cache).
  // If offline, this will fail and socket-service.js will handle its own error state.
  event.respondWith(
    fetch(event.request).catch(() => {
      throw new Error('Network request failed (non-cached cross-origin)');
    })
  );
});


