/*
 * Taleward Web-App: kleiner Service Worker, damit die App sich auf dem Startbildschirm installieren lässt und
 * schnell startet. Er fasst NUR Dateien der App selbst an (gleiche Herkunft) – nie Anfragen an Vereinsserver.
 */
const CACHE = 'taleward-app-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // Server-Anfragen unberührt lassen
  if (req.mode === 'navigate') {
    // Seite selbst: immer frisch vom Netz, sonst die zuletzt gesehene Fassung
    e.respondWith(fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req)));
    return;
  }
  // Gebaute Dateien haben Prüfsummen im Namen – einmal laden, dann aus dem Speicher
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
