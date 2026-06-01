import { useCallback, useRef, useState, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { ChevronDown, Check, MapPin, User as UserIcon, Phone, Lock, LockKeyhole, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';
import { areasApi } from '@shu/api-client';
import { useAuthStore } from '../../src/stores/auth.store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

export default function Register() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const register = useAuthStore((s) => s.register);
  const citySheetRef = useRef<BottomSheet>(null);
  const villageSheetRef = useRef<BottomSheet>(null);

  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [areaId, setAreaId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: areas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: () => areasApi.list(),
  });

  const uniqueCities = useMemo(() => Array.from(new Set(areas.map((a: any) => a.city))), [areas]);
  const villagesForCity = useMemo(() => areas.filter((a: any) => a.city === selectedCity), [areas, selectedCity]);
  const selectedVillageLabel = useMemo(() => areas.find((a: any) => a.id === areaId)?.name || '', [areas, areaId]);

  const openCitySheet = useCallback(() => citySheetRef.current?.expand(), []);
  const closeCitySheet = useCallback(() => citySheetRef.current?.close(), []);

  const openVillageSheet = useCallback(() => {
    if (selectedCity) villageSheetRef.current?.expand();
  }, [selectedCity]);
  const closeVillageSheet = useCallback(() => villageSheetRef.current?.close(), []);

  const selectCity = useCallback((city: string) => {
    setSelectedCity(city);
    setAreaId(null);
    closeCitySheet();
  }, [closeCitySheet]);

  const selectVillage = useCallback((area: { id: string; name: string }) => {
    setAreaId(area.id);
    closeVillageSheet();
  }, [closeVillageSheet]);

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
    <View style={styles.container}>
      {/* Top AppBar */}
      <View style={[styles.appBar, { paddingTop: Platform.OS === 'ios' ? insets.top || spacing[4] : spacing[4] }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowRight size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.appBarTitle}>شو عبالك؟</Text>
        <View style={styles.appBarIconWrap}>
          <UserIcon size={20} color="#4e2200" />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing[8] }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.heroTitle}>إنشاء حساب جديد</Text>
          <Text style={styles.heroSubtitle}>انضم إلينا واستمتع بأشهى المأكولات والخدمات في فلسطين</Text>
        </View>

        {/* Registration Form */}
        <View style={styles.form}>
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>الاسم الكامل</Text>
            <View style={styles.inputContainer}>
              <View style={styles.inputIconRight}>
                <UserIcon size={18} color={colors.textMuted} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="أدخل اسمك الكامل"
                placeholderTextColor={colors.border}
                value={name}
                onChangeText={setName}
                textAlign="right"
              />
            </View>
          </View>

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>رقم الهاتف</Text>
            <View style={styles.inputContainer}>
              <View style={styles.inputIconRight}>
                <Phone size={18} color={colors.textMuted} />
              </View>
              <TextInput
                style={[styles.input, { paddingLeft: 60 }]}
                placeholder="059XXXXXXX"
                placeholderTextColor={colors.border}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                textAlign="right"
              />
              <View style={styles.prefixContainer}>
                <Text style={styles.prefixText}>+970</Text>
              </View>
            </View>
          </View>

          {/* City Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>المدينة</Text>
            <TouchableOpacity style={styles.areaSelector} onPress={openCitySheet} activeOpacity={0.8}>
              <View style={styles.inputIconRight}>
                <MapPin size={18} color={selectedCity ? colors.primary : colors.textMuted} />
              </View>
              <Text style={[styles.areaSelectorText, selectedCity ? styles.areaSelectorTextSelected : null]}>
                {selectedCity || 'اختر مدينتك'}
              </Text>
              <View style={styles.areaChevron}>
                <ChevronDown size={20} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Village Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>القرية / الحي</Text>
            <TouchableOpacity 
              style={[styles.areaSelector, !selectedCity && { opacity: 0.6 }]} 
              onPress={openVillageSheet} 
              activeOpacity={0.8}
              disabled={!selectedCity}
            >
              <View style={styles.inputIconRight}>
                <MapPin size={18} color={areaId ? colors.primary : colors.textMuted} />
              </View>
              <Text style={[styles.areaSelectorText, areaId ? styles.areaSelectorTextSelected : null]}>
                {selectedVillageLabel || 'اختر قريتك أو حيك'}
              </Text>
              <View style={styles.areaChevron}>
                <ChevronDown size={20} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>كلمة المرور</Text>
            <View style={styles.inputContainer}>
              <View style={styles.inputIconRight}>
                <Lock size={18} color={colors.textMuted} />
              </View>
              <TextInput
                style={[styles.input, { paddingLeft: 48 }]}
                placeholder="كلمة المرور"
                placeholderTextColor={colors.border}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                textAlign="right"
              />
              <Pressable
                style={styles.eyeIconLeft}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff size={18} color={colors.textMuted} />
                ) : (
                  <Eye size={18} color={colors.textMuted} />
                )}
              </Pressable>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>تأكيد كلمة المرور</Text>
            <View style={styles.inputContainer}>
              <View style={styles.inputIconRight}>
                <LockKeyhole size={18} color={colors.textMuted} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="أعد إدخال كلمة المرور"
                placeholderTextColor={colors.border}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                textAlign="right"
              />
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Terms Checkbox */}
          <Pressable style={styles.checkRow} onPress={() => setAgreed((v) => !v)}>
            <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
              {agreed ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
            </View>
            <Text style={styles.termsText}>
              أوافق على <Text style={styles.termsBold}>الشروط والأحكام</Text> و <Text style={styles.termsBold}>سياسة الخصوصية</Text> الخاصة بشو عبالك.
            </Text>
          </Pressable>

          {/* Submit Button */}
          <Pressable
            style={[styles.submitBtn, (!agreed || loading) && styles.submitBtnDisabled]}
            onPress={handleRegister}
            disabled={!agreed || loading}
          >
            {loading ? (
              <ActivityIndicator color="#4e2200" />
            ) : (
              <Text style={styles.submitBtnText}>إنشاء حساب</Text>
            )}
          </Pressable>
        </View>

        {/* Login Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>عندك حساب؟ </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={styles.footerLink}>سجّل دخول</Text>
            </Pressable>
          </Link>
        </View>

        {/* Visual Decoration */}
        <View style={styles.decorationWrap}>
          <Image
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlsqdL2okG3UAb0LNFcpDvuhV8FuenzbYSkaaHCQYbZtuKvPUXnJ5_fg16BZXFA26McnF9m2ZGvxJmPTX8w949vaFl_vjqlEAwXcSb2JdznUQqEETy2KpzDKzakaOzrdt0-czTBRsKRoa6b4MCdaXXEXORs-_XvkNgcIfITY6X1-rMnbfkw7fOMGUHmD0vcJlQlWB02OdqL-3O7tgFTv15DRyRAshRvFNtxRH3m6wFTlADUCxieOhLhg8mcNsfjr-YLep7XyGssdTj' }}
            style={styles.decorationImage}
            contentFit="contain"
          />
        </View>
      </ScrollView>

      {/* City bottom sheet */}
      <BottomSheet
        ref={citySheetRef}
        index={-1}
        snapPoints={['50%']}
        enablePanDownToClose
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <Text style={styles.sheetTitle}>اختر مدينتك</Text>
        <BottomSheetFlatList
          data={uniqueCities}
          keyExtractor={(item) => item as string}
          contentContainerStyle={styles.sheetList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.areaItem, selectedCity === item && styles.areaItemActive]}
              onPress={() => selectCity(item as string)}
              activeOpacity={0.7}
            >
              <Text style={[styles.areaItemText, selectedCity === item && styles.areaItemTextActive]}>
                {item as string}
              </Text>
              {selectedCity === item && <Check size={18} color={colors.primary} strokeWidth={2.5} />}
            </TouchableOpacity>
          )}
        />
      </BottomSheet>

      {/* Village bottom sheet */}
      <BottomSheet
        ref={villageSheetRef}
        index={-1}
        snapPoints={['60%']}
        enablePanDownToClose
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <Text style={styles.sheetTitle}>اختر قريتك أو حيك</Text>
        <BottomSheetFlatList
          data={villagesForCity}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.sheetList}
          renderItem={({ item }: any) => (
            <TouchableOpacity
              style={[styles.areaItem, areaId === item.id && styles.areaItemActive]}
              onPress={() => selectVillage(item)}
              activeOpacity={0.7}
            >
              <Text style={[styles.areaItemText, areaId === item.id && styles.areaItemTextActive]}>
                {item.name}
              </Text>
              {areaId === item.id && <Check size={18} color={colors.primary} strokeWidth={2.5} />}
            </TouchableOpacity>
          )}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCF3DC', // background-cream
  },

  // App Bar
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    backgroundColor: '#FCF3DC',
    zIndex: 50,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
      android: { elevation: 2 },
      web: { boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
    }),
  },
  backBtn: {
    padding: spacing[1],
  },
  appBarTitle: {
    fontSize: 26, // headline-lg-mobile
    fontFamily: fontFamily.bold, // headline-lg-mobile (Cairo)
    color: colors.primary,
  },
  appBarIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffdbc7', // primary-fixed
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[8],
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: spacing[6],
    textAlign: 'center'
  },
  heroTitle: {
    fontSize: 24, // headline-md
    fontFamily: fontFamily.bold,
    color: colors.primary,
    marginBottom: spacing[2],
  },
  heroSubtitle: {
    fontSize: 15,
    fontFamily: fontFamily.regular,
    color: '#564337', // on-surface-variant
    textAlign: 'center',
  },

  // Form 
  form: {
    gap: spacing[5],
  },
  inputGroup: {
    gap: spacing[1],
  },
  inputLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: '#564337',
    paddingHorizontal: 4,
    textAlign: 'right',
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIconRight: {
    position: 'absolute',
    right: 0,
    height: '100%',
    paddingHorizontal: 12,
    justifyContent: 'center',
    zIndex: 1,
  },
  input: {
    flex: 1,
    height: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(229, 224, 213, 1)', // border-beige
    borderRadius: radius.xl,
    paddingRight: 44,
    paddingLeft: 16,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.textPrimary,
  },
  prefixContainer: {
    position: 'absolute',
    left: 0,
    height: '100%',
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(229, 224, 213, 1)',
  },
  prefixText: {
    color: colors.primary,
    fontFamily: fontFamily.bold,
    fontSize: 15,
  },
  eyeIconLeft: {
    position: 'absolute',
    left: 0,
    height: '100%',
    paddingHorizontal: 16,
    justifyContent: 'center',
    zIndex: 1,
  },

  // Area Selector
  areaSelector: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(229, 224, 213, 1)',
    borderRadius: radius.xl,
  },
  areaSelectorText: {
    flex: 1,
    paddingRight: 44,
    fontSize: 15,
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    textAlign: 'right',
  },
  areaSelectorTextSelected: {
    color: colors.textPrimary
  },
  areaChevron: {
    paddingHorizontal: 16,
  },

  // Checkbox
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(229, 224, 213, 1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  termsText: {
    flex: 1,
    color: '#564337',
    fontSize: 13,
    fontFamily: fontFamily.medium,
    textAlign: 'right',
    lineHeight: 20,
  },
  termsBold: {
    color: colors.primary,
    fontFamily: fontFamily.bold,
  },

  errorText: {
    color: colors.error,
    fontSize: fontSizes.sm,
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    marginTop: spacing[1],
  },

  // Submit Button
  submitBtn: {
    width: '100%',
    height: 52,
    backgroundColor: 'rgba(230, 120, 30, 1)', // primary-container
    borderRadius: radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[4],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#4e2200', // on-primary-container
    fontFamily: fontFamily.bold,
    fontSize: 16,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing[8]
  },
  footerText: {
    color: '#564337', // on-surface-variant 
    fontSize: 15,
    fontFamily: fontFamily.regular
  },
  footerLink: {
    color: colors.primary,
    fontFamily: fontFamily.bold,
    fontSize: 15,
    textDecorationLine: 'underline',
    textDecorationColor: '#ffb688', // inverse-primary
  },

  // Visual Decoration
  decorationWrap: {
    marginTop: 'auto',
    paddingTop: spacing[8],
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.15,
  },
  decorationImage: {
    width: '100%',
    height: 96,
  },

  // Bottom sheet styles
  sheetBg: { backgroundColor: '#FFFFFF', borderRadius: radius.xl },
  sheetHandle: { backgroundColor: colors.border, width: 40 },
  sheetTitle: {
    fontSize: 17, // body-lg
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229, 224, 213, 1)',
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
    fontSize: 15,
    color: colors.textPrimary,
    fontFamily: fontFamily.regular,
  },
  areaItemTextActive: { color: colors.primary, fontFamily: fontFamily.semibold },
});
