import { useEffect } from 'react';
import { I18nManager } from 'react-native';
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

function GlobalSocketListener() {
  const router = useRouter();
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleDriverRequest = (payload: { orderId: string; businessName: string; areaName: string; total: number }) => {
      console.log('WS instant driver request received globally:', payload.orderId);
      router.push({
        pathname: '/request-alert',
        params: {
          orderId: payload.orderId,
          businessName: payload.businessName,
          areaName: payload.areaName,
          total: String(payload.total),
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
    if (!I18nManager.isRTL) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(true);
    }
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
          </Stack>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
