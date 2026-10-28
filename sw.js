/* Service worker: keeps the app working offline.
   App files: network first (so updates arrive as soon as you are online), cache as fallback.
   Fonts: cache first. Supabase calls are never cached. */
const V = "shorts-tracker-v1";
const SHELL = ["./", "index.html", "styles.css", "app.js", "config.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    e.respondWith(
      fetch(r).then(res => {
        if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }
        return res;
      }).catch(() => caches.match(r).then(m => m || caches.match("index.html")))
    );
  } else if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith(
      caches.match(r).then(m => m || fetch(r).then(res => {
        const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); return res;
      }))
    );
  }
});
