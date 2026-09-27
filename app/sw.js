/* Ayg'oqchi app — offline service worker
   HTML/CSS/JS uchun: network-first (har doim yangi versiya), offline'da keshdan.
   Rasmlar uchun: cache-first.
   Yangi versiya chiqqanda CACHE nomini oshiring. */

var CACHE = 'aygoqchi-app-v1';

var ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/game.css',
  'css/app.css',
  'js/data.js',
  'js/game.js',
  'js/firebase-config.js',
  'js/auth.js',
  'js/economy.js',
  'js/app.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png'
];

function put(req, res) {
  if (res && res.status === 200 && res.type === 'basic') {
    caches.open(CACHE).then(function (c) { c.put(req, res.clone()); });
  }
  return res;
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;

  var url;
  try { url = new URL(e.request.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  var dynamic = e.request.mode === 'navigate' || /\.(html|css|js|webmanifest)$/.test(url.pathname);

  if (dynamic) {
    /* network-first: onlayn bo'lsa har doim eng yangi fayl */
    e.respondWith(
      fetch(e.request).then(function (res) { return put(e.request, res); })
        .catch(function () {
          return caches.match(e.request).then(function (hit) {
            return hit || caches.match('index.html');
          });
        })
    );
  } else {
    /* cache-first: ikonkalar va boshqa statik fayllar */
    e.respondWith(
      caches.match(e.request).then(function (hit) {
        return hit || fetch(e.request).then(function (res) { return put(e.request, res); });
      })
    );
  }
});
