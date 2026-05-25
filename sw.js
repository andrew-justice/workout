// sw.js — service worker for Workout Tracker PWA
// Strategy: cache-first for the shell, network-first nothing (we're offline-first).
// Bump CACHE_VERSION on every deploy to invalidate old caches.

const CACHE_VERSION = "wt-v4";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  // Google Fonts (cached on first load)
  "https://fonts.googleapis.com/css2?family=Anton&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(SHELL).catch((err) => {
        // Don't fail install if a CDN font URL is unreachable
        console.warn("[sw] partial cache:", err);
      })
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Only cache GETs
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Cache same-origin and font CDN responses opportunistically
        if (response && response.status === 200 &&
            (request.url.startsWith(self.location.origin) ||
             request.url.includes("fonts.googleapis.com") ||
             request.url.includes("fonts.gstatic.com"))) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => {
        // Offline fallback for navigations
        if (request.mode === "navigate") return caches.match("./index.html");
        return new Response("", { status: 504 });
      });
    })
  );
});
