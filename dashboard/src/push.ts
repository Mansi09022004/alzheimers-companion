/**
 * Browser Web Push for the caregiver dashboard — a critical alert (SOS, above all)
 * reaches the caregiver even with the tab closed, as long as they've clicked
 * "Enable alerts" once and the browser is running.
 */
import { notifications } from './api';
import { VAPID_PUBLIC_KEY } from './config';

// `Uint8Array.from(...)` types as `Uint8Array<ArrayBufferLike>`, which the Push API's
// `applicationServerKey` (a plain `BufferSource`) won't accept — build via `new
// Uint8Array(n)` instead, which is backed by a real `ArrayBuffer`.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64Safe);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY;
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

/** Registers the service worker, asks for permission, and saves the subscription. */
export async function enablePushAlerts(): Promise<void> {
  if (!pushSupported()) throw new Error('Browser alerts are not supported here.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permission was not granted.');

  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Could not read the subscription.');
  }
  await notifications.subscribe({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  });
}

export async function disablePushAlerts(): Promise<void> {
  const sub = await getPushSubscription();
  if (!sub) return;
  await notifications.unsubscribe(sub.endpoint).catch(() => {});
  await sub.unsubscribe();
}
