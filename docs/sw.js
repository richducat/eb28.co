const DEDICATED_ALARM_HOSTNAMES = new Set(['app.wakeupyabish.com']);

function isDedicatedAlarmHost() {
  return DEDICATED_ALARM_HOSTNAMES.has(self.location.hostname.toLowerCase());
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  if (!isDedicatedAlarmHost()) {
    event.waitUntil((async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      await self.registration.unregister();
      await Promise.all(
        clientList.map((client) => {
          if (typeof client.navigate === 'function') {
            return client.navigate(client.url);
          }

          return Promise.resolve();
        }),
      );
    })());
    return;
  }

  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  if (!isDedicatedAlarmHost()) {
    return;
  }

  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
