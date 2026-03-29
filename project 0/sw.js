// ScreenGuard Service Worker v1.0
// Caches all app assets for offline use

const CACHE_NAME = 'screenguard-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap'
];

// ---- INSTALL: cache all assets ----
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching app shell');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ---- ACTIVATE: clear old caches ----
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ---- FETCH: serve from cache first, then network ----
self.addEventListener('fetch', event => {
  // Skip non-GET and chrome-extension requests
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension://')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Cache valid responses
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Offline fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// ---- PUSH NOTIFICATIONS ----
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title   = data.title   || 'ScreenGuard';
  const options = {
    body:    data.body    || 'You have a new screen time alert.',
    icon:    './icons/icon-192.png',
    badge:   './icons/icon-72.png',
    vibrate: [200, 100, 200],
    tag:     'screenguard-alert',
    data:    { url: data.url || './' },
    actions: [
      { action: 'view',    title: '📊 View Stats' },
      { action: 'dismiss', title: '✕ Dismiss'     }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'view') {
    event.waitUntil(clients.openWindow('./index.html'));
  }
});
