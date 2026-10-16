const CACHE_NAME = "njengine-static-v7";
const SHELL = [
  "/",
  "/index.html",
  "/__grok/manifest.webmanifest",
  "/__grok/icon-180.png",
  "/__grok/icon-192.png",
  "/__grok/icon-512.png",
  "/games/drifin-slot-cover.jpg",
  "/games/corrida-lunar-cover.jpg",
  "/games/corrida-lunar/",
  "/sounds/njengine-boot.mp3",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("njengine-static-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || (await caches.match("/index.html")) || (await caches.match("/"));
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
        return response;
      });
    }),
  );
});
