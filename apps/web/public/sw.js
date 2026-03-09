/// <reference lib="webworker" />

/**
 * Sardoba PMS - Service Worker
 *
 * Strategies:
 *   - Static assets (JS, CSS, images, fonts): Cache-First
 *   - API /v1/ responses: Network-First with stale fallback
 *   - Navigation requests: Network-First with offline.html fallback
 *
 * Also handles:
 *   - Push notification display
 *   - Notification click routing
 *   - skipWaiting on message from client
 */

const CACHE_VERSION = 'sardoba-v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

// Assets to pre-cache during install
const PRECACHE_URLS = [
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

/**
 * Returns true when the request is for a static asset we want to
 * cache-first (immutable between deployments or long-lived).
 */
function isStaticAsset(url) {
  const path = url.pathname;
  return (
    path.startsWith('/_next/static/') ||
    path.match(/\.(js|css|woff2?|ttf|otf|eot|ico|png|jpg|jpeg|gif|svg|webp|avif)$/) !== null
  );
}

/**
 * Returns true when the request targets the backend API.
 */
function isApiRequest(url) {
  return url.pathname.includes('/v1/');
}

/**
 * Returns true for HTML navigation requests (page loads).
 */
function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

// -------------------------------------------------------------------
// Install: pre-cache critical assets
// -------------------------------------------------------------------

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

// -------------------------------------------------------------------
// Activate: clean up old caches
// -------------------------------------------------------------------

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// -------------------------------------------------------------------
// Fetch: route requests to the appropriate caching strategy
// -------------------------------------------------------------------

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle http(s) — skip chrome-extension://, etc.
  if (!url.protocol.startsWith('http')) return;

  // Skip non-GET requests (POST, PUT, DELETE, etc.)
  if (event.request.method !== 'GET') return;

  // 1. Static assets -> cache-first
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // 2. API requests -> network-first (stale-while-revalidate style)
  if (isApiRequest(url)) {
    event.respondWith(networkFirst(event.request, API_CACHE));
    return;
  }

  // 3. Navigation requests -> network-first with offline fallback
  if (isNavigationRequest(event.request)) {
    event.respondWith(navigationFetch(event.request));
    return;
  }
});

// -------------------------------------------------------------------
// Cache-First: try cache, fall back to network, then cache result
// -------------------------------------------------------------------

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // If both cache and network fail, return a basic error response
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// -------------------------------------------------------------------
// Network-First: try network, cache result, fall back to cache
// -------------------------------------------------------------------

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: 'offline', message: 'No cached data available' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// -------------------------------------------------------------------
// Navigation: network-first with offline.html fallback
// -------------------------------------------------------------------

async function navigationFetch(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Serve the offline page as the final fallback
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) return offlinePage;

    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// -------------------------------------------------------------------
// Push Notifications
// -------------------------------------------------------------------

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = {
      title: 'Sardoba PMS',
      body: event.data.text(),
    };
  }

  const title = data.title || 'Sardoba PMS';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    tag: data.tag || 'sardoba-notification',
    data: {
      url: data.url || '/calendar',
    },
    vibrate: [100, 50, 100],
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// -------------------------------------------------------------------
// Notification Click
// -------------------------------------------------------------------

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/calendar';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // If a window with the app is already open, focus it and navigate
      for (const client of clients) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(targetUrl);
    })
  );
});

// -------------------------------------------------------------------
// Message handler: skipWaiting for seamless updates
// -------------------------------------------------------------------

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING' || event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
