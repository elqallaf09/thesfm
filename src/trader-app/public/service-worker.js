const CACHE_NAME = "the-sfm-trader-v20260917-integrated-trader";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/detail.html",
  "/semantic-tokens.css?v=20260713-central-system",
  "/cinema.css?v=20260717-shell-unify-drawer-20260916-controls-20260915",
  "/detail.css?v=20260714-phase34",
  "/theme-bridge.js?v=20260714-phase34",
  "/assets/drawer-data.js?v=20260916-symbol-data",
  "/assets/drawer-mobile.css?v=20260916-symbol-data",
  "/assets/drawer-focus.js?v=20260916-symbol-data",
  "./watchlist-engine.js?v=20260917-integrated-trader",
  "./watchlist-view.js?v=20260917-integrated-trader",
  "./watchlist.css?v=20260917-integrated-trader",
  "/app.js?v=20260917-integrated-trader",
  "/detail.js?v=20260714-phase34-signal-gate-20260915",
  "/manifest.webmanifest",
  "/assets/trading-cinematic-bg.jpg",
  "/assets/world-dotted-map.png",
  "/assets/ai-bull-wireframe.png",
  "/the-sfm-trader-icon-256.png",
  "/the-sfm-trader-icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Network-first for JS/CSS (always fresh), cache-first for images
  const isAsset = /\.(png|ico|svg|webp|jpg|jpeg|gif|woff2?)(\?|$)/.test(url.pathname);
  if (isAsset) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }))
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
