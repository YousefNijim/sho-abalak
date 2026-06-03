import { useEffect } from 'react';
import { I18nManager } from 'react-native';

// Force RTL at the module level — runs before any component mounts.
// NOTE: forceRTL takes effect on the NEXT app launch after the JS bundle runs
// for the first time. A fresh install or full kill-and-relaunch is required.
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
} from '@expo-google-fonts/cairo';
import { colors } from '../src/theme';
import { getQueryClient } from '../src/lib/query-client';
import { useAuthStore } from '../src/stores/auth.store';
import { useSocket } from '../src/hooks/useSocket';
import { usePushNotifications } from '../src/hooks/usePushNotifications';

function GlobalSocketListener() {
  const router = useRouter();
  const socket = useSocket();

  // Register for FCM push + handle notification taps (additive to the live socket below).
  usePushNotifications();

  useEffect(() => {
    if (!socket) return;

    const handleDriverRequest = (payload: {
      batchId: string;
      orders: { orderId: string; businessName: string; areaName: string; addressDetail?: string; total: number; items: { name: string; quantity: number }[] }[];
    }) => {
      // Serialise the orders array as JSON so it survives expo-router params (strings only)
      router.push({
        pathname: '/request-alert',
        params: {
          batchId: payload.batchId,
          ordersJson: JSON.stringify(payload.orders),
        },
      });
    };

    socket.on('driver:request', handleDriverRequest);
    return () => {
      socket.off('driver:request', handleDriverRequest);
    };
  }, [socket, router]);

  return null;
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const queryClient = getQueryClient();
  const hydrate = useAuthStore((s) => s.hydrate);

  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_800ExtraBold,
  });

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <GlobalSocketListener />
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.textPrimary,
              headerTitleStyle: { fontFamily: 'Cairo_700Bold', fontSize: 18 },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="request-alert" options={{ presentation: 'modal', title: 'طلب جديد' }} />
            <Stack.Screen name="active-delivery" options={{ title: 'التوصيل النشط' }} />
            <Stack.Screen name="notifications" options={{ headerShown: false }} />
          </Stack>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
