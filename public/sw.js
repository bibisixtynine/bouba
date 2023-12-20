// sw.js
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("hello-world-cache").then((cache) => {
      return cache.addAll([
        "/",
        "/index.html",
        "https://cdn.glitch.global/e9dd0e1e-4b3f-4dde-8529-ef27526840fe/bouba192.png?v=1703020087930",
      ]);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
