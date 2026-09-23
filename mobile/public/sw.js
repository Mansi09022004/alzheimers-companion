// Minimal service worker — its only job is to make the web build installable as a
// PWA (Chrome requires an active SW for the install prompt). This app has no
// offline caching or push handling of its own; both are left to the network/OS.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
