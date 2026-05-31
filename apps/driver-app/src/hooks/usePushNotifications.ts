import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { notificationsApi } from '@shu/api-client';
import { useAuthStore } from '../stores/auth.store';

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
    });
  }

  const { data } = await Notifications.getDevicePushTokenAsync();
  return data ?? null;
}

/** Registers the driver device for push on login, unregisters on logout, handles taps. */
export function usePushNotifications() {
  const token = useAuthStore((s) => s.token);
  const router = useRouter();
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
    const tapSub = Notifications.addNotificationResponseReceivedListener((resp) => {
      routeForData(router, resp.notification.request.content.data as Record<string, unknown>);
    });
    Notifications.getLastNotificationResponseAsync().then((resp) => {
      if (resp) routeForData(router, resp.notification.request.content.data as Record<string, unknown>);
    });
    return () => {
      tapSub.remove();
    };
  }, [router]);
}
