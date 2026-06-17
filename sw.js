const CACHE_NAME = 'abed-bott-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/variables.css',
  './css/base.css',
  './css/animations.css',
  './css/components.css',
  './css/dashboard.css',
  './css/splash.css',
  './js/app.js',
  './js/state-manager.js',
  './js/socket-service.js',
  './js/security-gate.js',
  './js/drive-controls.js',
  './js/ui-controller.js',
  './js/error-handler.js',
  './js/command-service.js',
  './assets/icon-32.png',
  './assets/icon-180.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Roboto+Mono:wght@300;400;500&display=swap'
];

// Install Event - cache core assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching App Shell...');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - clear old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - network first with cache fallback, or cache first for static files
self.addEventListener('fetch', (e) => {
  // Only handle GET requests and local/font assets
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Cache-first strategy for local assets and external fonts
  if (ASSETS.includes(`./${url.pathname.split('/').pop()}`) || 
      url.hostname === 'fonts.googleapis.com' || 
      url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch updated in background
          fetch(e.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse));
            }
          }).catch(() => {});
          return cachedResponse;
        }
        return fetch(e.request).then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  } else {
    // Network-first for other requests (e.g. WebSocket connection fallback, API calls, etc.)
    e.respondWith(
      fetch(e.request)
        .catch(() => caches.match(e.request))
    );
  }
});
