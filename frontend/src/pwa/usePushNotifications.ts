import { useState, useEffect } from 'react';
import { api } from '../services/api.js';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSupport = () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setIsSupported(false);
        setLoading(false);
        return;
      }
      setIsSupported(true);
      setPermission(Notification.permission);
      
      // Check existing subscription
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
          setLoading(false);
        });
      });
    };
    
    checkSupport();
  }, []);

  const subscribe = async () => {
    if (!isSupported) return false;
    
    setLoading(true);
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      
      if (permissionResult !== 'granted') {
        throw new Error('Permission not granted for Notification');
      }

      const reg = await navigator.serviceWorker.ready;
      
      // Fetch VAPID public key from backend
      const res = await api.get<{ publicKey: string }>('/push/public-key');
      if (!res.data?.publicKey) throw new Error('VAPID key not configured on server');
      
      const applicationServerKey = urlBase64ToUint8Array(res.data.publicKey);
      
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      // Send to backend
      await api.post('/push/subscribe', {
        subscription,
        userAgent: navigator.userAgent,
        platform: navigator.platform
      });

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('Failed to subscribe', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!isSupported) return false;
    
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      
      if (subscription) {
        await api.delete('/push/subscribe', { endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      
      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error('Failed to unsubscribe', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe
  };
}
