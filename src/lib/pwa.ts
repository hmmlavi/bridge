"use client";

export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener(
    "load",
    () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* PWA is optional — the app works without it */
      });
    },
    { once: true }
  );
}
