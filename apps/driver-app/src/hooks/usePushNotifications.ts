import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { notificationsApi } from '@shu/api-client';
import { useAuthStore } from '../stores/auth.store';
import { useNotificationsStore } from '../stores/notifications.store';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** A tapped driver notification opens the incoming delivery-request alert. */
function routeForData(router: ReturnType<typeof useRouter>, data?: Record<string, unknown>) {
  if (!data) return;
  const orderId = data['orderId'] ? String(data['orderId']) : undefined;
  if (orderId) router.push({ pathname: '/request-alert', params: { orderId } });
}

async function getPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

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
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { data } = await Notifications.getDevicePushTokenAsync();
  return data ?? null;
}

/** Registers the driver device for push on login, unregisters on logout, handles taps. */
export function usePushNotifications() {
  const token = useAuthStore((s) => s.token);
  const router = useRouter();
  const addNotification = useNotificationsStore((s) => s.add);
  const deviceTokenRef = useRef<string | null>(null);

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
              app: 'driver',
            });
          } catch (e) {
            console.warn('registerToken failed:', (e as Error).message);
          }
        })
        .catch((e) => console.warn('getPushToken failed:', (e as Error).message));
    } else if (deviceTokenRef.current) {
      const dead = deviceTokenRef.current;
      deviceTokenRef.current = null;
      notificationsApi.unregisterToken(dead).catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    // Record a notification into the in-app list (deduped by request id in the store).
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
      record(resp.notification.request);
      routeForData(router, resp.notification.request.content.data as Record<string, unknown>);
    });

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
