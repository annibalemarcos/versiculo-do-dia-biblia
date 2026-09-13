// Service Worker for Staff/Admin Push Notifications
// Versículo do Dia / Bíblia Admin Platform

const CACHE_NAME = 'admin-staff-sw-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Real Push event handler
self.addEventListener('push', (event) => {
  let data = {};
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (err) {
    try {
      data = { message: event.data ? event.data.text() : 'Nova notificação interna' };
    } catch (_) {
      data = {};
    }
  }

  const title = data.title || 'Central de Atendimento Staff';
  const body = data.message || data.body || 'Você possui uma nova notificação no painel.';
  const icon = data.icon || '/favicon.svg';
  const tag = data.tag || (data.data && data.data.type) || 'staff-notification';
  const actionUrl = (data.data && data.data.action_url) || data.action_url || '/tickets';

  const notificationOptions = {
    body: body,
    icon: icon,
    badge: icon,
    tag: tag,
    renotify: true,
    requireInteraction: false,
    data: {
      url: actionUrl,
      notification_id: data.data ? data.data.id : null,
      type: data.data ? data.data.type : null,
      timestamp: Date.now()
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

// Notification Click event handler -> Open/Focus browser window and navigate to target URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/tickets';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(targetUrl);
          }
          return;
        }
      }
      // If no window is open, open a new browser tab/window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Background message handler from client app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, actionUrl, type } = event.data;
    self.registration.showNotification(title || 'Central de Atendimento Staff', {
      body: body || 'Notificação no painel administrativo',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: type || 'staff-local',
      data: { url: actionUrl || '/tickets' }
    });
  }
});
