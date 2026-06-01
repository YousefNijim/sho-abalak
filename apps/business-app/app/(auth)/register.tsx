import React, { useState } from 'react';
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
} from 'lucide-react-native';
import { areasApi, authApi, tagsApi } from '@shu/api-client';
import type { BusinessType, Tag } from '@shu/api-client';
import { colors, fontFamily, fontSizes, radius, spacing } from '../../src/theme';

const TYPES: { value: BusinessType; label: string }[] = [
  { value: 'FOOD', label: 'مطعم / مأكولات' },
  { value: 'STORE', label: 'متجر / سوبرماركت' },
];

export default function RegisterStore() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [type, setType] = useState<BusinessType>('FOOD');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [areaId, setAreaId] = useState<string | null>(null);
  const [addressDetail, setAddressDetail] = useState('');

  const [showCity, setShowCity] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const [showArea, setShowArea] = useState(false);
  const [areaSearch, setAreaSearch] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data: areas = [] } = useQuery({ queryKey: ['areas'], queryFn: () => areasApi.list() });
  const { data: tags = [] } = useQuery({
    queryKey: ['tags', type],
    queryFn: () => tagsApi.list(type),
  });

  const register = useMutation({
    mutationFn: () =>
      authApi.registerBusiness({
        name: name.trim(),
        type,
        tagIds,
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

  const toggleTag = (id: string) =>
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));

  const selectType = (t: BusinessType) => {
    setType(t);
    setTagIds([]); // tags are type-specific — reset when switching
  };

  const handleSubmit = () => {
    setError('');
    if (!name.trim() || !ownerName.trim() || !phone.trim() || !areaId) {
      setError('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }
    register.mutate();
  };

  const isFormValid = !!(name.trim() && ownerName.trim() && phone.trim() && areaId);

  const selectedArea = areas.find((a) => a.id === areaId);
  const areaLabel = selectedArea ? selectedArea.name : 'اختر القرية أو الحي';

  const uniqueCities = React.useMemo(() => Array.from(new Set(areas.map((a: any) => a.city))), [areas]);
  const villagesForCity = React.useMemo(() => areas.filter((a: any) => a.city === selectedCity), [areas, selectedCity]);

  const filteredVillages = villagesForCity.filter(
    (a: any) => a.name.includes(areaSearch)
  );

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
        contentContainerStyle={{ padding: spacing[4], paddingBottom: spacing[4] }}
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

        {/* Type (FOOD / STORE) */}
        <Field label="نوع المتجر">
          <View style={styles.segment}>
            {TYPES.map((t) => {
              const active = type === t.value;
              return (
                <Pressable
                  key={t.value}
                  style={[styles.segmentItem, active && styles.segmentItemActive]}
                  onPress={() => selectType(t.value)}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        {/* Tags (multi-select, type-specific) */}
        <Field label="التصنيفات (اختر واحداً أو أكثر)">
          <View style={styles.tagsWrap}>
            {tags.length === 0 ? (
              <Text style={styles.tagsEmpty}>لا توجد تصنيفات متاحة</Text>
            ) : (
              tags.map((tag: Tag) => {
                const active = tagIds.includes(tag.id);
                return (
                  <Pressable
                    key={tag.id}
                    style={[styles.tagChip, active && styles.tagChipActive]}
                    onPress={() => toggleTag(tag.id)}
                  >
                    {active && <Check size={14} color="#fff" />}
                    <Text style={[styles.tagChipText, active && styles.tagChipTextActive]}>{tag.name}</Text>
                  </Pressable>
                );
              })
            )}
          </View>
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

        {/* City */}
        <Field label="المدينة">
          <Pressable style={styles.inputRow} onPress={() => setShowCity((v) => !v)}>
            <ChevronDown size={18} color={colors.textMuted} />
            <Text style={[styles.inputValue, !selectedCity && { color: colors.textMuted }]}>
              {selectedCity || 'اختر المدينة'}
            </Text>
            <MapPin size={18} color={colors.textMuted} />
          </Pressable>
          {showCity && (
            <View style={styles.picker}>
              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                {uniqueCities.map((city) => (
                  <Pressable
                    key={city as string}
                    style={[styles.pickerItem, selectedCity === city && styles.pickerItemActive]}
                    onPress={() => {
                      setSelectedCity(city as string);
                      setAreaId(null);
                      setShowCity(false);
                    }}
                  >
                    {selectedCity === city && <Check size={16} color={colors.primary} />}
                    <Text style={[styles.pickerText, selectedCity === city && { color: colors.primary }]}>
                      {city as string}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </Field>

        {/* Village */}
        <Field label="القرية أو الحي">
          <Pressable 
            style={[styles.inputRow, !selectedCity && { opacity: 0.6 }]} 
            onPress={() => { if (selectedCity) setShowArea((v) => !v); }}
            disabled={!selectedCity}
          >
            <ChevronDown size={18} color={colors.textMuted} />
            <Text style={[styles.inputValue, !selectedArea && { color: colors.textMuted }]}>
              {areaLabel}
            </Text>
            <MapPin size={18} color={colors.textMuted} />
          </Pressable>
          {showArea && selectedCity && (
            <View style={styles.picker}>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  value={areaSearch}
                  onChangeText={setAreaSearch}
                  placeholder="ابحث عن قرية أو حي..."
                  placeholderTextColor={colors.textMuted}
                  textAlign="right"
                />
              </View>
              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                {filteredVillages.map((a: any) => (
                  <Pressable
                    key={a.id}
                    style={[styles.pickerItem, areaId === a.id && styles.pickerItemActive]}
                    onPress={() => {
                      setAreaId(a.id);
                      setShowArea(false);
                      setAreaSearch('');
                    }}
                  >
                    {areaId === a.id && <Check size={16} color={colors.primary} />}
                    <Text style={[styles.pickerText, areaId === a.id && { color: colors.primary }]}>
                      {a.name}
                    </Text>
                  </Pressable>
                ))}
                {filteredVillages.length === 0 && (
                  <Text style={styles.noResultText}>لا توجد نتائج</Text>
                )}
              </ScrollView>
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
      </ScrollView>

      <View style={[styles.stickyFooter, { paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, spacing[4]) : spacing[4] }]}>
        <Pressable
          style={[
            styles.primaryBtn,
            (!isFormValid || register.isPending) && styles.primaryBtnDisabled
          ]}
          onPress={handleSubmit}
          disabled={!isFormValid || register.isPending}
        >
          {register.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>إرسال طلب التسجيل</Text>
          )}
        </Pressable>
      </View>
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
  searchRow: {
    padding: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    height: 40,
    backgroundColor: '#f3f4f6',
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  noResultText: {
    padding: spacing[4],
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
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
  segment: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  segmentItem: {
    flex: 1,
    paddingVertical: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: fontSizes.base, fontFamily: fontFamily.semibold, color: colors.textMuted },
  segmentTextActive: { color: '#fff' },
  tagsWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing[2] },
  tagsEmpty: { fontSize: fontSizes.sm, fontFamily: fontFamily.regular, color: colors.textMuted },
  tagChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tagChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tagChipText: { fontSize: fontSizes.sm, fontFamily: fontFamily.semibold, color: colors.textPrimary },
  tagChipTextActive: { color: '#fff' },
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
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: { fontSize: fontSizes.lg, fontFamily: fontFamily.bold, color: '#fff' },
  stickyFooter: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 10 },
    }),
  },
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
