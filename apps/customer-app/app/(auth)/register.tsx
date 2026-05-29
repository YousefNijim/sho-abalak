import { useCallback, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { ChevronDown, Check, MapPin } from 'lucide-react-native';
import { Button, Input } from '@shu/ui-components/native';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';
import { areasApi } from '@shu/api-client';
import { useAuthStore } from '../../src/stores/auth.store';

export default function Register() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [areaId, setAreaId] = useState<string | null>(null);
  const [areaLabel, setAreaLabel] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: areas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: () => areasApi.list(),
  });

  const openAreaSheet = useCallback(() => bottomSheetRef.current?.expand(), []);
  const closeAreaSheet = useCallback(() => bottomSheetRef.current?.close(), []);

  const selectArea = useCallback((area: { id: string; city: string; name: string }) => {
    setAreaId(area.id);
    setAreaLabel(`${area.city} - ${area.name}`);
    closeAreaSheet();
  }, [closeAreaSheet]);

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
    <>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>
            <Text style={{ color: colors.primary }}>شو </Text>
            <Text style={{ color: colors.secondary }}>عبالك؟</Text>
          </Text>
          <Text style={styles.subtitle}>إنشاء حساب جديد</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="الاسم الكامل"
            placeholder="مثال: أحمد محمد"
            value={name}
            onChangeText={setName}
          />
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
          <Input
            label="تأكيد كلمة المرور"
            placeholder="••••••••"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          {/* Area selector — triggers bottom sheet */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>المنطقة</Text>
            <TouchableOpacity style={styles.areaSelector} onPress={openAreaSheet} activeOpacity={0.8}>
              <MapPin size={18} color={areaId ? colors.primary : colors.textMuted} />
              <Text style={[styles.areaSelectorText, areaId ? styles.areaSelectorTextSelected : null]}>
                {areaLabel || 'اختر منطقتك'}
              </Text>
              <ChevronDown size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Terms checkbox */}
          <Pressable style={styles.checkRow} onPress={() => setAgreed((v) => !v)}>
            <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
              {agreed ? <Check size={13} color="#fff" strokeWidth={3} /> : null}
            </View>
            <Text style={styles.muted}>أوافق على الشروط والأحكام</Text>
          </Pressable>

          <Button
            title="إنشاء حساب"
            loading={loading}
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

      {/* Area bottom sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['60%']}
        enablePanDownToClose
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <Text style={styles.sheetTitle}>اختر منطقتك</Text>
        <BottomSheetFlatList
          data={areas as Array<{ id: string; city: string; name: string }>}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.sheetList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.areaItem, areaId === item.id && styles.areaItemActive]}
              onPress={() => selectArea(item)}
              activeOpacity={0.7}
            >
              <Text style={[styles.areaItemText, areaId === item.id && styles.areaItemTextActive]}>
                {item.city} - {item.name}
              </Text>
              {areaId === item.id && <Check size={16} color={colors.primary} strokeWidth={2.5} />}
            </TouchableOpacity>
          )}
        />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[8],
    paddingBottom: spacing[8],
    backgroundColor: colors.background,
  },
  header: { alignItems: 'center', marginBottom: spacing[8] },
  logo: { fontSize: fontSizes['3xl'], fontFamily: fontFamily.extrabold, textAlign: 'center' },
  subtitle: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
    marginTop: spacing[1],
  },
  form: { gap: spacing[6] },
  fieldWrap: { gap: 6 },
  fieldLabel: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    fontFamily: fontFamily.medium,
  },
  areaSelector: {
    height: 52,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  areaSelectorText: {
    flex: 1,
    fontSize: fontSizes.base,
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    textAlign: 'right',
  },
  areaSelectorTextSelected: { color: colors.textPrimary },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  muted: { color: colors.textMuted, fontSize: fontSizes.base, fontFamily: fontFamily.regular },
  link: { color: colors.primary, fontFamily: fontFamily.semibold, fontSize: fontSizes.base },
  bottom: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing[6] },
  errorText: {
    color: colors.error,
    fontSize: fontSizes.sm,
    textAlign: 'center',
    fontFamily: fontFamily.regular,
  },
  // Bottom sheet styles
  sheetBg: { backgroundColor: colors.surface, borderRadius: radius.xl },
  sheetHandle: { backgroundColor: colors.border, width: 40 },
  sheetTitle: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetList: { paddingBottom: spacing[8] },
  areaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0E8',
  },
  areaItemActive: { backgroundColor: '#FFF8F0' },
  areaItemText: {
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    fontFamily: fontFamily.regular,
  },
  areaItemTextActive: { color: colors.primary, fontFamily: fontFamily.semibold },
});
