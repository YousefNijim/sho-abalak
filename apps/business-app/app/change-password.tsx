import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Eye, EyeOff, LockKeyhole, CheckCircle2, Shield } from 'lucide-react-native';
import { authApi } from '@shu/api-client';
import { colors, fontFamily, fontSizes, radius, spacing } from '../src/theme';

export default function ChangePassword() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword: current, newPassword: next }),
    onSuccess: () => setDone(true),
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? 'تعذّر تغيير كلمة المرور';
      setError(Array.isArray(msg) ? msg.join(' ، ') : String(msg));
    },
  });

  const handleSave = () => {
    setError('');
    if (!current || !next || !confirm) {
      setError('يرجى تعبئة جميع الحقول');
      return;
    }
    if (next.length < 6) {
      setError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (next !== confirm) {
      setError('كلمة المرور الجديدة غير متطابقة');
      return;
    }
    mutation.mutate();
  };

  if (done) {
    return (
      <View style={[styles.container, styles.successWrap, { paddingTop: insets.top }]}>
        <CheckCircle2 size={64} color={colors.success} />
        <Text style={styles.successTitle}>تم تغيير كلمة المرور</Text>
        <Text style={styles.successDesc}>يمكنك الآن استخدام كلمة المرور الجديدة لتسجيل الدخول.</Text>
        <Pressable style={[styles.submitBtn, { width: '100%', marginTop: spacing[4] }]} onPress={() => router.back()}>
          <Text style={styles.submitBtnText}>تم</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
          <ArrowRight size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>تغيير كلمة المرور</Text>
        <View style={styles.iconBtn} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing[4], paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.iconCircle}>
              <LockKeyhole size={44} color={colors.primary} strokeWidth={1.5} />
            </View>
            <Text style={styles.heroDesc}>اختر كلمة مرور قوية لحماية حساب متجرك.</Text>
          </View>

          <PasswordField
            label="كلمة المرور الحالية"
            value={current}
            onChange={setCurrent}
            show={showCurrent}
            toggle={() => setShowCurrent((v) => !v)}
          />
          <PasswordField
            label="كلمة المرور الجديدة"
            value={next}
            onChange={setNext}
            show={showNext}
            toggle={() => setShowNext((v) => !v)}
            hint="6 أحرف على الأقل"
          />
          <PasswordField
            label="تأكيد كلمة المرور الجديدة"
            value={confirm}
            onChange={setConfirm}
            show={showConfirm}
            toggle={() => setShowConfirm((v) => !v)}
          />

          <View style={styles.securityHint}>
            <Shield size={20} color={colors.secondary} />
            <Text style={styles.securityBody}>
              تجنّب كلمات المرور السهلة مثل الأرقام المتسلسلة أو تاريخ الميلاد.
            </Text>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.submitBtn, mutation.isPending && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>حفظ التغييرات</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  toggle,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  toggle: () => void;
  hint?: string;
}) {
  return (
    <View style={{ marginBottom: spacing[4] }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <Pressable style={styles.eyeBtn} onPress={toggle} hitSlop={8}>
          {show ? <EyeOff size={20} color={colors.textMuted} /> : <Eye size={20} color={colors.textMuted} />}
        </Pressable>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder="••••••••"
          placeholderTextColor={colors.textMuted}
          secureTextEntry={!show}
          textAlign="right"
        />
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSizes.xl, fontFamily: fontFamily.bold, color: colors.primary },
  hero: { alignItems: 'center', marginVertical: spacing[5] },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#fff3e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  heroDesc: {
    fontSize: fontSizes.base,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing[4],
  },
  label: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: spacing[2],
    marginRight: spacing[1],
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing[4],
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: fontSizes.base,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
    paddingVertical: 0,
    textAlign: 'right',
  },
  eyeBtn: { paddingLeft: spacing[2] },
  hint: {
    fontSize: fontSizes.xs,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing[1],
    marginRight: spacing[1],
  },
  securityHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  securityBody: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    textAlign: 'right',
    lineHeight: 20,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSizes.sm,
    fontFamily: fontFamily.medium,
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  submitBtn: {
    height: 54,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
  },
  submitBtnText: { fontSize: fontSizes.lg, fontFamily: fontFamily.bold, color: '#fff' },
  successWrap: { alignItems: 'center', justifyContent: 'center', padding: spacing[6] },
  successTitle: {
    fontSize: fontSizes['2xl'],
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    marginTop: spacing[4],
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  successDesc: {
    fontSize: fontSizes.base,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
});
