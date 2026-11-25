const CACHE_NAME = "yasuh-shell-v1";
const APP_SHELL = ["/", "/musek-icon.svg"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.includes("/auth/")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/")));
    return;
  }
  if (APP_SHELL.includes(url.pathname)) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
  }
});
self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  const title = data.title || "YASUH";
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || "You have a new update.",
    icon: "/musek-icon.svg",
    badge: "/musek-icon.svg",
    data: { url: data.url || "/" }
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
    const existing = clients.find(client => client.url.startsWith(self.location.origin));
    if (existing) return existing.navigate(target).then(() => existing.focus());
    return self.clients.openWindow(target);
  }));
});
