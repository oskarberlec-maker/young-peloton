/* Young Peloton PWA: network first for live race data; safe offline shell fallback. */
const CACHE = 'yp-pwa-v1';
const APP_SHELL = ['/', '/season', '/manifest.webmanifest', '/yp-favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => Promise.allSettled(APP_SHELL.map(url => cache.add(url)))));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('yp-pwa-') && key !== CACHE).map(key => caches.delete(key)))),
    self.clients.claim(),
  ]));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Prefer new content whenever there is a connection, including on reinstall.
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok && response.type === 'basic') {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
    }
    return response;
  }).catch(async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    if (event.request.mode === 'navigate') return (await caches.match('/')) || Response.error();
    return Response.error();
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = '/season';
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients => {
    for (const client of clients) {
      if (new URL(client.url).origin === self.location.origin) return client.focus().then(() => client.navigate(target));
    }
    return self.clients.openWindow(target);
  }));
});
