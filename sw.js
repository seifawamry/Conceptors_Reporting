// Conceptors Veterinary CRM Service Worker for Mobile Push & Offline Shell
const CACHE_NAME = 'conceptors-crm-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Mobile push notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) || './';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle incoming Web Push
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (_) {
      data = { title: 'Conceptors Field Order Alert', body: event.data.text() };
    }
  }

  const title = data.title || '🚨 Conceptors Field Order Alert';
  const options = {
    body: data.body || 'A new field sales order has been booked.',
    icon: './conceptors_logo.png',
    badge: './conceptors_logo.png',
    vibrate: [300, 150, 300, 150, 450],
    data: data.data || { url: './' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
