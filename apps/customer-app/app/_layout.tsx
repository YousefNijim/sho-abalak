import { useEffect } from 'react';
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);
import { Stack } from 'expo-router';
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
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import { useGlobalOrderSync } from '../src/hooks/useGlobalOrderSync';

SplashScreen.preventAutoHideAsync();

/** Mounts push-notification registration + listeners inside the providers. */
function PushNotificationsBridge() {
  usePushNotifications();
  return null;
}

/** App-wide order-status reconciliation (clears stale active-order card on cancel/deliver). */
function OrderSyncBridge() {
  useGlobalOrderSync();
  return null;
}

export default function RootLayout() {
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
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={getQueryClient()}>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <PushNotificationsBridge />
          <OrderSyncBridge />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.textPrimary,
              headerTitleStyle: { fontFamily: 'Cairo_700Bold', fontSize: 18 },
              contentStyle: { backgroundColor: colors.background },
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="sections" options={{ headerShown: false }} />
            <Stack.Screen name="stores-coming-soon" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="business/[id]" options={{ title: '' }} />
            <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="cart" options={{ headerShown: false }} />
            <Stack.Screen name="tracking" options={{ title: 'تتبع الطلب' }} />
            <Stack.Screen name="profile/addresses" options={{ headerShown: false }} />
            <Stack.Screen name="profile/notifications" options={{ headerShown: false }} />
            <Stack.Screen name="profile/change-password" options={{ headerShown: false }} />
            <Stack.Screen name="profile/about" options={{ headerShown: false }} />
          </Stack>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
