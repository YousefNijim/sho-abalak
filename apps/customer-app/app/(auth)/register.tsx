import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Button, Input } from '@shu/ui-components/native';
import { colors, fontSizes, radius, spacing } from '../../src/theme';

export default function Register() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        <Input label="الاسم الكامل" placeholder="مثال: أحمد محمد" />
        <Input label="رقم الهاتف" placeholder="59X-XXX-XXX" keyboardType="phone-pad" />
        <Input label="كلمة المرور" placeholder="••••••••" secureTextEntry />
        <Input label="تأكيد كلمة المرور" placeholder="••••••••" secureTextEntry />
        <Input label="المنطقة" placeholder="اختر منطقتك" />

        <Pressable style={styles.checkRow} onPress={() => setAgreed((v) => !v)}>
          <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
            {agreed ? <Text style={styles.check}>✓</Text> : null}
          </View>
          <Text style={styles.muted}>أوافق على الشروط والأحكام</Text>
        </Pressable>

        <Button title="إنشاء حساب" disabled={!agreed} onPress={() => router.push('/(auth)/otp')} />
      </View>

      <View style={styles.bottom}>
        <Text style={styles.muted}>عندك حساب؟ </Text>
        <Link href="/(auth)/login">
          <Text style={styles.link}>سجّل دخول</Text>
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing[5], backgroundColor: colors.background },
  form: { gap: spacing[4] },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  checkbox: { width: 22, height: 22, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  check: { color: '#fff', fontWeight: '700', fontSize: 14 },
  muted: { color: colors.textMuted, fontSize: fontSizes.base },
  link: { color: colors.primary, fontWeight: '600', fontSize: fontSizes.base },
  bottom: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing[6] },
});
