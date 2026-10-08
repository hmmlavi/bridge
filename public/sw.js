// Bridge service worker — network-only pass-through.
// Present so the app is installable as a PWA; nothing is cached,
// so pairing and transfers always hit the live session.
const VERSION = "bridge-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", () => {
  // Intentionally empty: network-only. Required for installability.
});
