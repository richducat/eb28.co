// Scoped alarm service worker for eb28.co/alarmclock.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let index = 0; index < clientList.length; index += 1) {
          if (clientList[index].focused) {
            client = clientList[index];
          }
        }
        return client.focus();
      }

      return clients.openWindow('/alarmclock/');
    }),
  );
});
