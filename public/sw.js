// NoteNala Service Worker

const CACHE_NAME = 'notenala-v1';

// Install event - activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event - claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push event - tampilkan notifikasi
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'NoteNala', body: event.data ? event.data.text() : 'Ada pengingat baru!' };
  }

  const title = data.title || 'NoteNala';
  const options = {
    body: data.body || 'Ada pengingat tugas untuk kamu!',
    icon: '/logo.jpg',
    badge: '/logo.jpg',
    vibrate: [100, 50, 100],
    requireInteraction: false,
    tag: 'notenala-reminder',        // replace notifikasi lama dengan yang baru
    renotify: true,
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Buka NoteNala' },
      { action: 'close', title: 'Tutup' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Fokus tab yang sudah terbuka jika ada
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Buka tab baru jika tidak ada
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Fetch event - network first, tidak intercept navigation
self.addEventListener('fetch', (event) => {
  // Hanya cache GET request untuk assets statis
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') return; // biarkan Next.js handle navigation

  // Biarkan request berjalan normal (tidak ada offline caching agresif
  // yang bisa mengganggu autentikasi)
});
