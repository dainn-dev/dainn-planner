self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    try {
      payload = { body: event.data ? event.data.text() : '' };
    } catch (__) {
      payload = {};
    }
  }

  const title = payload.title || 'Notification';
  const options = {
    body: payload.body || '',
    data: {
      url: payload.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';
  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            try { await client.navigate(url); } catch (_) {}
          }
          return;
        }
      }
      if (clients.openWindow) {
        await clients.openWindow(url);
      }
    })(),
  );
});

