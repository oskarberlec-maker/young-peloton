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
self.addEventListener('push', event => {
  let payload = null;
  try { payload = event.data?.json() || null; } catch { /* Ignore malformed messages. */ }
  if (!payload || payload.type !== 'confirmed-2027' ||
      typeof payload.title !== 'string' || typeof payload.body !== 'string' ||
      typeof payload.raceId !== 'string') return;
  event.waitUntil(self.registration.showNotification(payload.title.slice(0,120), {
    body:payload.body.slice(0,250),
    icon:'/icons/icon-192.png',
    badge:'/icons/icon-192.png',
    tag:'yp-confirmed-2027-'+payload.raceId,
    data:{url:typeof payload.url === 'string' && /^\/race\/[A-Za-z0-9_-]+$/.test(payload.url) ? payload.url : '/season'},
  }));
});
self.addEventListener('pushsubscriptionchange', event => {
  // A visit to Young Peloton will re-register a rotated browser endpoint.
  // Device-local bookmarks remain private unless the user opted into push.
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const link = event.notification.data?.url;
  const target = typeof link === 'string' && /^\/race\/[A-Za-z0-9_-]+$/.test(link) ? link : '/season';
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients => {
    for (const client of clients) {
      if (new URL(client.url).origin === self.location.origin) return client.focus().then(() => client.navigate(target));
    }
    return self.clients.openWindow(target);
  }));
});
