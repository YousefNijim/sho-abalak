import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input } from '@shu/ui-components/native';
import { colors, fontSizes, fontFamily, spacing } from '../../src/theme';
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
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing[10] }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>
          <Text style={{ color: colors.primary }}>شو </Text>
          <Text style={{ color: colors.secondary }}>عبالك؟</Text>
        </Text>
        <Text style={styles.welcome}>المنشأة التجارية</Text>
        <Text style={styles.subtitle}>سجّل دخولك للمتابعة</Text>
      </View>

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

        <Button
          title="دخول"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[8],
    backgroundColor: colors.background,
  },
  header: { alignItems: 'center', marginBottom: spacing[10] },
  logo: { fontSize: fontSizes['3xl'], fontFamily: fontFamily.extrabold, textAlign: 'center' },
  welcome: {
    fontSize: fontSizes['2xl'],
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing[6],
  },
  subtitle: {
    fontSize: fontSizes.base,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    marginTop: spacing[1],
  },
  form: { gap: spacing[6] },
  errorText: {
    color: colors.error,
    fontSize: fontSizes.sm,
    textAlign: 'center',
    fontFamily: fontFamily.regular,
  },
});
