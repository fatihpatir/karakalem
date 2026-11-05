const CACHE_NAME = 'karakalem-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './sketch-engine.js',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Karakalem-SW] Dosyalar önbelleğe alınıyor...');
      return cache.addAll(ASSETS).catch(err => console.warn('[Karakalem-SW] Bazı dosyalar alınamadı:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Karakalem-SW] Eski önbellek temizleniyor:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          if (event.request.method === 'GET' && !event.request.url.startsWith('chrome-extension')) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });
      });
    }).catch(() => caches.match('./index.html'))
  );
});
