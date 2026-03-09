'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { usePropertyId } from './use-property-id';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const propertyId = usePropertyId();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);

      navigator.serviceWorker.ready.then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      });
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported || !propertyId) return false;

    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== 'granted') return false;

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.warn('VAPID key not configured');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    });

    const json = subscription.toJSON();
    await api.post(`/properties/${propertyId}/push/subscribe`, {
      endpoint: json.endpoint,
      keys: json.keys,
    });

    setIsSubscribed(true);
    return true;
  }, [isSupported, propertyId]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !propertyId) return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await api.delete(`/properties/${propertyId}/push/subscribe`, {
        data: { endpoint: subscription.endpoint },
      });
      await subscription.unsubscribe();
    }
    setIsSubscribed(false);
  }, [isSupported, propertyId]);

  return { permission, isSubscribed, isSupported, subscribe, unsubscribe };
}
