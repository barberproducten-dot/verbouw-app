// Verbouwhub service worker: caches the static app shell so it opens
// instantly from the homescreen icon; data always comes fresh from the
// Supabase edge function (never cached).
var CACHE = 'verbouwhub-v2';
var SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).catch(function () {}));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  // Never touch the Supabase API/data calls — those must always be live.
  if (url.hostname.indexOf('supabase.co') >= 0) return;

  event.respondWith(
    fetch(req, { cache: 'no-store' }).then(function (resp) {
      var copy = resp.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); });
      return resp;
    }).catch(function () {
      return caches.match(req).then(function (cached) { return cached || caches.match('./index.html'); });
    })
  );
});
