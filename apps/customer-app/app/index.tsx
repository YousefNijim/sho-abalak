import { useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fontSizes } from '../src/theme';

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace('/onboarding'), 1400);
    return () => clearTimeout(t);
  }, [router]);

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
  logo: { fontSize: fontSizes['4xl'], fontWeight: '800' },
  tagline: { fontSize: fontSizes.base, color: colors.textMuted, marginTop: 8 },
});
