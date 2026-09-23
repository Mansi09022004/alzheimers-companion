// Service worker for browser Web Push — lets a critical alert (SOS, above all)
// reach the caregiver even with the dashboard tab closed.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let payload = { title: "Alzheimer's Companion", body: 'You have a new alert.' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    /* fall back to the default payload above */
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/logo-icon.png',
      badge: '/logo-icon.png',
      data: payload.data || {},
      requireInteraction: true,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const patientId = event.notification.data?.patient_id;
  const url = patientId ? `/patients/${patientId}/alerts` : '/patients';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
