// Service worker: shows a push notice and opens the right page when the member taps it. It caches nothing.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = {}; }
  event.waitUntil(
    self.registration.showNotification(d.title || "Bekasi Board Game Hub", {
      body: d.body || "",
      tag: d.tag || undefined,
      icon: "/icon-192.png",
      badge: "/badge-96.png",
      data: { url: typeof d.url === "string" ? d.url : "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data && event.notification.data.url;
  // Only a path inside this site is opened.
  const url = new URL(typeof path === "string" && /^\/(?!\/)/.test(path) ? path : "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) { c.navigate(url); return c.focus(); }
      }
      return self.clients.openWindow(url);
    }),
  );
});
