const CACHE_NAME = "cameron-app-v48";

self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "./index.html";

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

    for (const client of windows) {
      if (client.url.includes("index.html") || client.url.endsWith("/")) {
        await client.focus();
        return;
      }
    }

    await self.clients.openWindow(targetUrl);
  })());
});
