import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Button, Input } from '@shu/ui-components/native';
import { colors, fontSizes, radius, spacing } from '../../src/theme';
import { areasApi } from '@shu/api-client';
import { useAuthStore } from '../../src/stores/auth.store';

export default function Register() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [areaId, setAreaId] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: areas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: () => areasApi.list(),
  });

  const handleRegister = async () => {
    setError('');
    if (!name || !phone || !password || !confirmPassword) {
      setError('يرجى ملء جميع الحقول');
      return;
    }
    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }
    if (!agreed) {
      setError('يجب الموافقة على الشروط');
      return;
    }
    setLoading(true);
    try {
      await register({ name, phone, password, areaId: areaId ?? undefined });
      router.push('/(auth)/otp');
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'حدث خطأ أثناء التسجيل';
      setError(Array.isArray(msg) ? msg.join(' ، ') : String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        <Input label="الاسم الكامل" placeholder="مثال: أحمد محمد" value={name} onChangeText={setName} />
        <Input label="رقم الهاتف" placeholder="59X-XXX-XXX" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        <Input label="كلمة المرور" placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} />
        <Input label="تأكيد كلمة المرور" placeholder="••••••••" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />

        {/* Area picker — simple list */}
        <View>
          <Text style={styles.fieldLabel}>المنطقة</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2], paddingVertical: spacing[1] }}>
            {areas.map((a: any) => (
              <Pressable
                key={a.id}
                style={[styles.areaPill, areaId === a.id && styles.areaPillActive]}
                onPress={() => setAreaId(a.id)}
              >
                <Text style={[styles.areaPillText, areaId === a.id && { color: '#fff' }]}>
                  {a.city} - {a.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable style={styles.checkRow} onPress={() => setAgreed((v) => !v)}>
          <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
            {agreed ? <Text style={styles.check}>✓</Text> : null}
          </View>
          <Text style={styles.muted}>أوافق على الشروط والأحكام</Text>
        </Pressable>

        <Button
          title={loading ? 'جاري التسجيل...' : 'إنشاء حساب'}
          disabled={!agreed || loading}
          onPress={handleRegister}
        />
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
  fieldLabel: { color: colors.textPrimary, fontWeight: '600', fontSize: fontSizes.sm, marginBottom: spacing[1] },
  areaPill: { paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  areaPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  areaPillText: { color: colors.textMuted, fontWeight: '600', fontSize: fontSizes.sm },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  checkbox: { width: 22, height: 22, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  check: { color: '#fff', fontWeight: '700', fontSize: 14 },
  muted: { color: colors.textMuted, fontSize: fontSizes.base },
  link: { color: colors.primary, fontWeight: '600', fontSize: fontSizes.base },
  bottom: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing[6] },
  errorText: { color: colors.error, fontSize: fontSizes.sm, textAlign: 'center' },
});
