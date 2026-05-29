import { useEffect } from 'react';
import { I18nManager } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { colors } from '../src/theme';
import { getQueryClient } from '../src/lib/query-client';
import { useAuthStore } from '../src/stores/auth.store';

export default function RootLayout() {
  const queryClient = getQueryClient();
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    // Force RTL
    if (!I18nManager.isRTL) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(true);
    }
    // Hydrate token
    hydrate();
  }, [hydrate]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.textPrimary,
            headerTitleStyle: { fontWeight: '700' },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="order/[id]" options={{ title: 'تفاصيل الطلب' }} />
          <Stack.Screen name="driver-selection" options={{ title: 'اختر عامل التوصيل' }} />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
