// Service worker minimal untuk SIMON BMKG.
// Tujuannya bukan caching agresif (data monitoring harus selalu fresh),
// tapi supaya browser (terutama Chrome/Android) mendeteksi web ini
// sebagai PWA yang "installable" secara penuh, bukan sekadar shortcut.

const CACHE_NAME = "simon-shell-v1";

// Hanya app-shell statis yang aman di-cache. Data API TIDAK di-cache
// di sini supaya status alat/monitoring tidak pernah basi.
const SHELL_ASSETS = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Strategi: network-first untuk navigasi & API, fallback ke cache
// hanya kalau benar-benar offline. Ini menghindari data stale.
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Jangan sentuh request non-GET (POST/PUT/DELETE ke API) sama sekali.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Jangan cache endpoint API sama sekali - selalu network.
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
  );
});
