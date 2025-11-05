const CACHE_NAME = 'queryjson-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/static/css/styles.min.css',
  '/static/js/app.min.js',
  '/static/images/site.webmanifest',
  '/static/images/favicon-32x32.png',
  '/static/images/favicon-16x16.png',
  '/static/images/apple-touch-icon.png',
  '/static/images/android-chrome-192x192.png',
  '/static/images/android-chrome-512x512.png'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Network first for HTML, cache first for assets
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Network first strategy for HTML files (always get latest)
  if (request.mode === 'navigate' || request.destination === 'document' ||
      url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache the new version
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache when offline
          return caches.match(request).then(cachedResponse => {
            return cachedResponse || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Cache first strategy for static assets (CSS, JS, images)
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(request).then(response => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Cache CDN resources and static assets
          if (request.url.includes('cdn.jsdelivr.net') ||
              request.url.includes('/static/')) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }

          return response;
        });
      })
  );
});
