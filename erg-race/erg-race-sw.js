// Erg Race service worker: network-first for its own folder, so updates
// show up on the next load; cached copies only when offline.
// Scoped to this folder; it never touches the parent app's caches.
const CACHE = 'erg-race-v1';
const CORE = ["./", "./erg-race.webmanifest", "./erg-race-icon-180.png", "./erg-race-icon-192.png", "./erg-race-icon-512.png"];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE)
    .then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => null))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith('erg-race-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const font = url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com';
  if (!font && !req.url.startsWith(self.registration.scope)) return;
  if (font) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
      return res;
    })));
    return;
  }
  e.respondWith(fetch(req).then((res) => {
    if (res.ok) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
    return res;
  }).catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./') : Response.error()))));
});
