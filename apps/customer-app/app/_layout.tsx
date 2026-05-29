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
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    if (!I18nManager.isRTL) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(true);
    }
    // Re-attach saved token to axios after hydration from AsyncStorage
    hydrate();
  }, []);

  return (
    <QueryClientProvider client={getQueryClient()}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.textPrimary,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="business/[id]" options={{ title: '' }} />
          <Stack.Screen name="cart" options={{ title: 'سلّتك' }} />
          <Stack.Screen name="tracking" options={{ title: 'تتبع الطلب' }} />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
