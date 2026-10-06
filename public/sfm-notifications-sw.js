/*
 * The root worker intentionally caches only public application-shell assets.
 * Account pages, API replies, authentication traffic, and financial data stay
 * network-only so an offline device cannot reveal stale private information.
 */
const CACHE_NAME = 'the-sfm-shell-v1';
const SHELL_ASSETS = [
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('the-sfm-shell-') && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate') return;

  event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
});

self.addEventListener('push', event => {
  let payload;
  try {
    payload = event.data?.json();
  } catch {
    return;
  }
  if (!payload) return;

  const url = typeof payload.url === 'string' && payload.url.startsWith('/') ? payload.url : '/notifications';
  event.waitUntil(
    self.registration.showNotification('THE SFM', {
      body: String(payload.body || '').slice(0, 240),
      icon: '/icons/icon-192.png',
      data: { url },
      tag: 'sfm-notification-center',
    }),
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = typeof event.notification.data?.url === 'string' ? event.notification.data.url : '/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(openWindows => {
      const existingWindow = openWindows.find(client => new URL(client.url).pathname === url);
      if (existingWindow) return existingWindow.focus();
      return clients.openWindow(url);
    }),
  );
});
