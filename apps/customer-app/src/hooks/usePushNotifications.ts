import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { notificationsApi } from '@shu/api-client';
import { useAuthStore } from '../stores/auth.store';
import { useNotificationsStore } from '../stores/notifications.store';

// Show notifications while the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Where a tapped notification should take the customer. */
function routeForData(router: ReturnType<typeof useRouter>, data?: Record<string, unknown>) {
  if (!data) return;
  const type = String(data['type'] ?? '');
  const orderId = data['orderId'] ? String(data['orderId']) : undefined;
  if ((type === 'order_status' || type === 'order_new') && orderId) {
    router.push({ pathname: '/tracking', params: { orderId } });
  }
}

async function getPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null; // push tokens only work on real devices

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'الإشعارات',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#E6781E',
    });
  }

  // Native FCM token (no EAS projectId needed since we send via firebase-admin server-side).
  const { data } = await Notifications.getDevicePushTokenAsync();
  return data ?? null;
}

/**
 * Registers this device for push on login and unregisters on logout.
 * Also wires foreground capture (into the in-app notifications list) and tap deep-linking.
 */
export function usePushNotifications() {
  const token = useAuthStore((s) => s.token);
  const router = useRouter();
  const addNotification = useNotificationsStore((s) => s.add);
  const deviceTokenRef = useRef<string | null>(null);

  // Register / unregister the device token with the backend, tied to auth.
  useEffect(() => {
    let cancelled = false;

    if (token) {
      getPushToken()
        .then(async (pushToken) => {
          if (cancelled || !pushToken) return;
          deviceTokenRef.current = pushToken;
          try {
            await notificationsApi.registerToken({
              token: pushToken,
              platform: Platform.OS === 'ios' ? 'ios' : 'android',
              app: 'customer',
            });
          } catch (e) {
            console.warn('registerToken failed:', (e as Error).message);
          }
        })
        .catch((e) => console.warn('getPushToken failed:', (e as Error).message));
    } else if (deviceTokenRef.current) {
      // logged out — drop the token server-side
      const dead = deviceTokenRef.current;
      deviceTokenRef.current = null;
      notificationsApi.unregisterToken(dead).catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [token]);

  // Foreground capture + tap handling.
  useEffect(() => {
    // Record a notification into the in-app list (dedupes by request id / recent content).
    const record = (req: Notifications.NotificationRequest) => {
      const c = req.content;
      addNotification({
        id: req.identifier,
        title: c.title ?? 'إشعار',
        body: c.body ?? '',
        data: (c.data ?? {}) as Record<string, string>,
      });
    };

    const recvSub = Notifications.addNotificationReceivedListener((n) => {
      record(n.request);
    });

    const tapSub = Notifications.addNotificationResponseReceivedListener((resp) => {
      // Background-delivered notifications never hit the foreground listener — record on tap too.
      record(resp.notification.request);
      routeForData(router, resp.notification.request.content.data as Record<string, unknown>);
    });

    // Cold start: app opened by tapping a notification.
    Notifications.getLastNotificationResponseAsync().then((resp) => {
      if (resp) {
        record(resp.notification.request);
        routeForData(router, resp.notification.request.content.data as Record<string, unknown>);
      }
    });

    return () => {
      recvSub.remove();
      tapSub.remove();
    };
  }, [router, addNotification]);
}
