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
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowRight,
  Store,
  User as UserIcon,
  Phone,
  MapPin,
  ChevronDown,
  Check,
  CheckCircle2,
  Tag,
} from 'lucide-react-native';
import { areasApi, authApi } from '@shu/api-client';
import { colors, fontFamily, fontSizes, radius, spacing } from '../../src/theme';

const CATEGORIES = [
  { value: 'RESTAURANT', label: 'مطاعم شرقية' },
  { value: 'STORE', label: 'سوبر ماركت' },
  { value: 'CAFE', label: 'حلويات ومخابز' },
] as const;

export default function RegisterStore() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('RESTAURANT');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [areaId, setAreaId] = useState<string | null>(null);
  const [addressDetail, setAddressDetail] = useState('');

  const [showCategory, setShowCategory] = useState(false);
  const [showArea, setShowArea] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data: areas = [] } = useQuery({ queryKey: ['areas'], queryFn: () => areasApi.list() });

  const register = useMutation({
    mutationFn: () =>
      authApi.registerBusiness({
        name: name.trim(),
        category,
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        areaId: areaId!,
        addressDetail: addressDetail.trim() || undefined,
      }),
    onSuccess: () => setSubmitted(true),
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? 'تعذّر إرسال الطلب، حاول مرة أخرى';
      setError(Array.isArray(msg) ? msg.join(' ، ') : String(msg));
    },
  });

  const handleSubmit = () => {
    setError('');
    if (!name.trim() || !ownerName.trim() || !phone.trim() || !areaId) {
      setError('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }
    register.mutate();
  };

  const categoryLabel = CATEGORIES.find((c) => c.value === category)?.label ?? '';
  const selectedArea = areas.find((a) => a.id === areaId);
  const areaLabel = selectedArea ? `${selectedArea.city} — ${selectedArea.name}` : 'اختر المنطقة';

  if (submitted) {
    return (
      <View style={[styles.container, styles.successWrap, { paddingTop: insets.top }]}>
        <View style={styles.successIcon}>
          <CheckCircle2 size={64} color={colors.success} />
        </View>
        <Text style={styles.successTitle}>تم إرسال طلبك بنجاح</Text>
        <Text style={styles.successDesc}>
          طلب تسجيل متجرك قيد المراجعة من قبل الإدارة. سيتم تفعيل حسابك وتزويدك بكلمة المرور عند
          الموافقة، وبعدها يمكنك تسجيل الدخول.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.primaryBtnText}>العودة لتسجيل الدخول</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable style={styles.headerBtn} onPress={() => router.back()} hitSlop={8}>
          <ArrowRight size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>تسجيل متجر جديد</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing[4], paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          أدخل بيانات متجرك وسيقوم فريق الإدارة بمراجعة الطلب وتفعيل الحساب.
        </Text>

        {/* Store name */}
        <Field label="اسم المتجر">
          <View style={styles.inputRow}>
            <Store size={18} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="مثال: مطعم الزيتون الأصيل"
              placeholderTextColor={colors.textMuted}
              textAlign="right"
            />
          </View>
        </Field>

        {/* Category */}
        <Field label="تصنيف المتجر">
          <Pressable style={styles.inputRow} onPress={() => setShowCategory((v) => !v)}>
            <ChevronDown size={18} color={colors.textMuted} />
            <Text style={styles.inputValue}>{categoryLabel}</Text>
            <Tag size={18} color={colors.textMuted} />
          </Pressable>
          {showCategory && (
            <View style={styles.picker}>
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c.value}
                  style={[styles.pickerItem, category === c.value && styles.pickerItemActive]}
                  onPress={() => {
                    setCategory(c.value);
                    setShowCategory(false);
                  }}
                >
                  {category === c.value && <Check size={16} color={colors.primary} />}
                  <Text
                    style={[styles.pickerText, category === c.value && { color: colors.primary }]}
                  >
                    {c.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </Field>

        {/* Owner name */}
        <Field label="اسم صاحب المتجر">
          <View style={styles.inputRow}>
            <UserIcon size={18} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              value={ownerName}
              onChangeText={setOwnerName}
              placeholder="الاسم الكامل"
              placeholderTextColor={colors.textMuted}
              textAlign="right"
            />
          </View>
        </Field>

        {/* Phone */}
        <Field label="رقم الهاتف">
          <View style={styles.phoneRow}>
            <Phone size={18} color={colors.textMuted} />
            <View style={styles.phonePrefix}>
              <Text style={styles.prefixText}>970+</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="0599XXXXXX"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              textAlign="left"
            />
          </View>
        </Field>

        {/* Area */}
        <Field label="المنطقة">
          <Pressable style={styles.inputRow} onPress={() => setShowArea((v) => !v)}>
            <ChevronDown size={18} color={colors.textMuted} />
            <Text style={[styles.inputValue, !selectedArea && { color: colors.textMuted }]}>
              {areaLabel}
            </Text>
            <MapPin size={18} color={colors.textMuted} />
          </Pressable>
          {showArea && (
            <View style={styles.picker}>
              {areas.map((a) => (
                <Pressable
                  key={a.id}
                  style={[styles.pickerItem, areaId === a.id && styles.pickerItemActive]}
                  onPress={() => {
                    setAreaId(a.id);
                    setShowArea(false);
                  }}
                >
                  {areaId === a.id && <Check size={16} color={colors.primary} />}
                  <Text style={[styles.pickerText, areaId === a.id && { color: colors.primary }]}>
                    {a.city} — {a.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </Field>

        {/* Address */}
        <Field label="العنوان بالتفصيل (اختياري)">
          <View style={styles.inputRow}>
            <MapPin size={18} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              value={addressDetail}
              onChangeText={setAddressDetail}
              placeholder="رام الله، المصيون، مقابل مجمع الدوائر"
              placeholderTextColor={colors.textMuted}
              textAlign="right"
            />
          </View>
        </Field>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.primaryBtn, register.isPending && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={register.isPending}
        >
          {register.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>إرسال طلب التسجيل</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing[4] }}>
      <Text style={styles.label}>{label}</Text>
      {children}
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
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSizes.xl, fontFamily: fontFamily.bold, color: colors.primary },
  intro: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: spacing[5],
    lineHeight: 22,
  },
  label: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: spacing[2],
    marginRight: spacing[1],
  },
  inputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing[4],
    height: 52,
    gap: spacing[3],
  },
  input: {
    flex: 1,
    fontSize: fontSizes.base,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
    paddingVertical: 0,
    textAlign: 'right',
  },
  inputValue: {
    flex: 1,
    fontSize: fontSizes.base,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  phoneRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing[4],
    height: 52,
    gap: spacing[2],
  },
  phonePrefix: {
    justifyContent: 'center',
    paddingLeft: spacing[2],
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  prefixText: { fontFamily: fontFamily.bold, color: colors.primary, fontSize: 14 },
  phoneInput: {
    flex: 1,
    height: '100%',
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    writingDirection: 'ltr',
  },
  picker: {
    marginTop: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerItemActive: { backgroundColor: '#fff3e0' },
  pickerText: {
    fontSize: fontSizes.base,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  errorText: {
    color: colors.error,
    fontSize: fontSizes.sm,
    fontFamily: fontFamily.medium,
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  primaryBtn: {
    height: 54,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
  },
  primaryBtnText: { fontSize: fontSizes.lg, fontFamily: fontFamily.bold, color: '#fff' },
  successWrap: { alignItems: 'center', justifyContent: 'center', padding: spacing[6] },
  successIcon: { marginBottom: spacing[5] },
  successTitle: {
    fontSize: fontSizes['2xl'],
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: spacing[3],
    textAlign: 'center',
  },
  successDesc: {
    fontSize: fontSizes.base,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing[6],
  },
});
