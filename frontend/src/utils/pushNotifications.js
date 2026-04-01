import { pushAPI } from '../services/api';

const STORAGE_KEY = 'push_permission_requested_v1';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function hasAuthToken() {
  try {
    return !!localStorage.getItem('token');
  } catch {
    return false;
  }
}

export async function initPushNotificationsOnce() {
  if (typeof window === 'undefined') return;
  if (!hasAuthToken()) return;
  if (!('Notification' in window)) return;
  if (!('serviceWorker' in navigator)) return;
  if (!('PushManager' in window)) return;

  // Don't keep nagging users who denied/ignored once.
  try {
    const asked = localStorage.getItem(STORAGE_KEY);
    if (asked === '1' && Notification.permission !== 'granted') return;
  } catch { /* ignore */ }

  let reg;
  try {
    reg = await navigator.serviceWorker.register('/push-sw.js');
  } catch {
    return;
  }

  // Request permission only once.
  if (Notification.permission === 'default') {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
    } catch {
      return;
    }
  }

  if (Notification.permission !== 'granted') return;

  try {
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await pushAPI.saveMyPushSubscription(existing);
      return;
    }
  } catch { /* ignore */ }

  const vapid = await pushAPI.getVapidPublicKey();
  const publicKey = vapid?.publicKey;
  const configured = vapid?.configured === true;
  if (!configured || !publicKey) return;

  try {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    await pushAPI.saveMyPushSubscription(sub);
  } catch {
    // User may have blocked notifications or subscription failed — skip silently.
  }
}

