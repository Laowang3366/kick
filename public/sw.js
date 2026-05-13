const CACHE_NAME = 'quick-translate-v6';
const CACHE_PREFIX = 'quick-translate-';
const CORE_ASSETS = ['./manifest.webmanifest', './app-icon.svg'];
const IS_LOCAL_DEV =
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1' ||
  self.location.hostname === '0.0.0.0';

self.addEventListener('install', (event) => {
  if (IS_LOCAL_DEV) {
    event.waitUntil(
      caches
        .keys()
        .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX)).map((key) => caches.delete(key))))
        .then(() => self.registration.unregister())
    );
    return;
  }

  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
});

self.addEventListener('activate', (event) => {
  if (IS_LOCAL_DEV) {
    event.waitUntil(
      caches
        .keys()
        .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX)).map((key) => caches.delete(key))))
        .then(() => self.clients.claim())
    );
    return;
  }

  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (IS_LOCAL_DEV || event.request.method !== 'GET') {
    return;
  }

  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ??
        fetch(event.request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
      );
    })
  );
});
