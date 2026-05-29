import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input } from '@shu/ui-components/native';
import { colors, fontSizes, spacing } from '../../src/theme';
import { useAuthStore } from '../../src/stores/auth.store';

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const login = useAuthStore((s) => s.login);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!phone || !password) {
      setError('الرجاء إدخال رقم الهاتف وكلمة المرور');
      return;
    }
    setLoading(true);
    try {
      await login({ phone, password });
      router.replace('/(tabs)');
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'بيانات الدخول غير صحيحة';
      setError(Array.isArray(msg) ? msg.join(' ، ') : String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 40 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.logo}>
        <Text style={{ color: colors.primary }}>شو </Text>
        <Text style={{ color: colors.secondary }}>عبالك؟</Text>
      </Text>
      <Text style={styles.welcome}>مرحباً بك</Text>

      <View style={styles.form}>
        <Input
          label="رقم الهاتف"
          placeholder="59X-XXX-XXX"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <Input
          label="كلمة المرور"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Link href="/(auth)/register" style={styles.forgot}>
          <Text style={styles.link}>نسيت كلمة المرور؟</Text>
        </Link>
        <Button
          title={loading ? 'جاري الدخول...' : 'دخول'}
          onPress={handleLogin}
          disabled={loading}
        />
      </View>

      <View style={styles.bottom}>
        <Text style={styles.muted}>ما عندك حساب؟ </Text>
        <Link href="/(auth)/register">
          <Text style={styles.link}>سجّل هون</Text>
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: spacing[5], backgroundColor: colors.background },
  logo: { fontSize: fontSizes['3xl'], fontWeight: '800', textAlign: 'center' },
  welcome: { fontSize: fontSizes.xl, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginTop: spacing[2], marginBottom: spacing[8] },
  form: { gap: spacing[4] },
  forgot: { alignSelf: 'flex-start' },
  link: { color: colors.primary, fontWeight: '600', fontSize: fontSizes.base },
  bottom: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing[6] },
  muted: { color: colors.textMuted, fontSize: fontSizes.base },
  errorText: { color: colors.error, fontSize: fontSizes.sm, textAlign: 'center' },
});
