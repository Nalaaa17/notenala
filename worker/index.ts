/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope;

self.addEventListener("push", (event) => {
  try {
    if (event.data) {
      let data: any = {};
      try {
        data = event.data.json();
      } catch (e) {
        data = { body: event.data.text() };
      }
      
      const options: any = {
        body: data.body || "Anda memiliki pemberitahuan baru.",
        icon: data.icon || "/logo-v2.png",
        badge: data.badge || "/file.svg",
        vibrate: [100, 50, 100],
        data: {
          dateOfArrival: Date.now(),
          primaryKey: "notenala-push",
          url: data.url || "/",
        },
      };
      event.waitUntil(
        self.registration.showNotification(
          data.title || "Notenala",
          options
        )
      );
    }
  } catch (err) {
    console.error("Error processing push event:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If the app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

export {};
