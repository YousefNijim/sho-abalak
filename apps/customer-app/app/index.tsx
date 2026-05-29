'use client';

import { useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fontSizes, fontFamily } from '../src/theme';
import { useAuthStore } from '../src/stores/auth.store';

export default function Splash() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    const t = setTimeout(() => {
      if (token) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding');
      }
    }, 1400);
    return () => clearTimeout(t);
  }, [router, token]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>
        <Text style={{ color: colors.primary }}>شو </Text>
        <Text style={{ color: colors.secondary }}>عبالك؟</Text>
      </Text>
      <Text style={styles.tagline}>منصة طلباتك</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  logo: { fontSize: fontSizes['4xl'], fontFamily: fontFamily.extrabold },
  tagline: { fontSize: fontSizes.base, color: colors.textMuted, marginTop: 8 },
});
