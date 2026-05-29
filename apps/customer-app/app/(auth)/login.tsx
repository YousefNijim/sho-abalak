import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input } from '@shu/ui-components/native';
import { colors, fontSizes, spacing } from '../../src/theme';

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
        <Input label="رقم الهاتف" placeholder="59X-XXX-XXX" keyboardType="phone-pad" />
        <Input label="كلمة المرور" placeholder="••••••••" secureTextEntry />
        <Link href="/(auth)/register" style={styles.forgot}>
          <Text style={styles.link}>نسيت كلمة المرور؟</Text>
        </Link>
        <Button title="دخول" onPress={() => router.replace('/(tabs)')} />
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
});
