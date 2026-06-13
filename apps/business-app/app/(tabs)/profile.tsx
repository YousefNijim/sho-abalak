import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Store,
  Phone,
  Camera,
  Save,
  CheckCircle,
  ChevronLeft,
  MapPin,
  Clock,
  Pencil,
  ArrowRight,
  KeyRound,
  X,
} from 'lucide-react-native';
import { businessesApi, tagsApi, areasApi } from '@shu/api-client';
import type { BusinessType, Tag } from '@shu/api-client';
import { colors, fontFamily, fontSizes, radius, spacing } from '../../src/theme';
import { uploadImage, imageUrl } from '../../src/lib/upload';
import { useAuthStore } from '../../src/stores/auth.store';

const TYPES: { value: BusinessType; label: string }[] = [
  { value: 'FOOD', label: 'مطعم / مأكولات' },
  { value: 'STORE', label: 'متجر / سوبرماركت' },
];

const DEFAULT_OPEN = '09:00 ص';
const DEFAULT_CLOSE = '11:00 م';

/** Alert.alert is a no-op on react-native-web — fall back to window.alert there. */
function notify(title: string, message?: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

export default function ProfileTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);

  const doLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  const { data: business, isLoading } = useQuery({
    queryKey: ['business-mine'],
    queryFn: () => businessesApi.mine(),
  });

  // form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<BusinessType>('FOOD');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [addressDetail, setAddressDetail] = useState('');
  const [openTime, setOpenTime] = useState(DEFAULT_OPEN);
  const [closeTime, setCloseTime] = useState(DEFAULT_CLOSE);
  const [deliveryAreaIds, setDeliveryAreaIds] = useState<string[]>([]);
  const [areaSearch, setAreaSearch] = useState('');

  // image picks (local uris pending upload)
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [logoLocalUri, setLogoLocalUri] = useState<string | null>(null);

  // ui state
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: availableTags = [] } = useQuery({
    queryKey: ['tags', type],
    queryFn: () => tagsApi.list(type),
  });

  const { data: allAreas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: () => areasApi.list(),
  });

  const cityVillages = useMemo(() => {
    if (!business?.area?.city) return [];
    return allAreas.filter((a) => a.city === business.area?.city);
  }, [allAreas, business]);

  const filteredVillages = useMemo(() => {
    if (!areaSearch.trim()) return cityVillages;
    return cityVillages.filter((v: any) => v.name.includes(areaSearch.trim()));
  }, [cityVillages, areaSearch]);

  useEffect(() => {
    if (business) {
      setName(business.name ?? '');
      setPhone(business.phone ?? '');
      setType(business.type ?? 'FOOD');
      setTagIds((business.tags ?? []).map((t) => t.id));
      setAddressDetail(business.addressDetail ?? '');
      setOpenTime(business.openTime ?? DEFAULT_OPEN);
      setCloseTime(business.closeTime ?? DEFAULT_CLOSE);
      setDeliveryAreaIds((business.deliveryAreas ?? []).map((a) => a.id));
      setCoverUri(null);
      setLogoLocalUri(null);
    }
  }, [business]);

  const isDirty = useMemo(() => {
    if (!business) return false;
    if (name !== (business.name ?? '')) return true;
    if (phone !== (business.phone ?? '')) return true;
    if (type !== (business.type ?? 'FOOD')) return true;
    if (addressDetail !== (business.addressDetail ?? '')) return true;
    if (openTime !== (business.openTime ?? DEFAULT_OPEN)) return true;
    if (closeTime !== (business.closeTime ?? DEFAULT_CLOSE)) return true;
    
    const originalTags = (business.tags ?? []).map((t) => t.id).sort().join(',');
    const currentTags = [...tagIds].sort().join(',');
    if (originalTags !== currentTags) return true;

    const originalDelivery = (business.deliveryAreas ?? []).map((a) => a.id).sort().join(',');
    const currentDelivery = [...deliveryAreaIds].sort().join(',');
    if (originalDelivery !== currentDelivery) return true;

    if (coverUri !== null) return true;
    if (logoLocalUri !== null) return true;

    return false;
  }, [business, name, phone, type, tagIds, addressDetail, openTime, closeTime, coverUri, logoLocalUri, deliveryAreaIds]);

  const toggleTag = (id: string) =>
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));

  const toggleDeliveryArea = (id: string) =>
    setDeliveryAreaIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const selectType = (t: BusinessType) => {
    setType(t);
    setTagIds([]); // tags are type-specific
  };

  const updateMutation = useMutation({
    mutationFn: (dto: Partial<Parameters<typeof businessesApi.update>[1]>) =>
      businessesApi.update(business!.id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-mine'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'فشل في حفظ التغييرات';
      notify('خطأ', Array.isArray(msg) ? msg.join('\n') : msg);
    },
  });

  const busy = updateMutation.isPending || uploading;

  const pickImage = async (target: 'cover' | 'logo') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      notify('تحتاج صلاحية الوصول للمعرض لتغيير الصورة');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: target === 'cover' ? [16, 9] : [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      if (target === 'cover') setCoverUri(result.assets[0].uri);
      else setLogoLocalUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!business) {
      notify('تعذّر الحفظ', 'لم يتم تحميل بيانات المتجر بعد. تأكد من الاتصال ثم أعد المحاولة.');
      return;
    }
    if (!name.trim()) {
      notify('تنبيه', 'اسم المتجر لا يمكن أن يكون فارغاً');
      return;
    }

    const dto: Record<string, unknown> = {
      name: name.trim(),
      phone: phone.trim(),
      type,
      tagIds,
      addressDetail: addressDetail.trim(),
      openTime,
      closeTime,
      deliveryAreaIds,
    };

    if (coverUri || logoLocalUri) {
      try {
        setUploading(true);
        if (coverUri) dto.imageUrl = await uploadImage(coverUri);
        if (logoLocalUri) dto.logoUrl = await uploadImage(logoLocalUri);
      } catch {
        notify('خطأ', 'فشل رفع الصورة، يرجى المحاولة مرة أخرى');
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }

    updateMutation.mutate(dto as any);
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      // Alert.alert is a no-op on react-native-web — use the native confirm.
      if (typeof window !== 'undefined' && window.confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        doLogout();
      }
      return;
    }
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تسجيل الخروج', style: 'destructive', onPress: doLogout },
    ]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['business-mine'] });
    setRefreshing(false);
  };

  const coverImage = coverUri ?? imageUrl(business?.imageUrl);
  const logoImage = logoLocalUri ?? imageUrl(business?.logoUrl);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable style={styles.headerBtn} onPress={handleLogout} hitSlop={8}>
          <ArrowRight size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>الحساب الشخصي</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        {/* Hero: cover + logo */}
        <View style={styles.hero}>
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.cover} contentFit="cover" />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <Store size={48} color="rgba(255,255,255,0.6)" />
            </View>
          )}
          <View style={styles.coverOverlay} />
          <Pressable style={styles.changeCoverBtn} onPress={() => pickImage('cover')}>
            <Pencil size={16} color={colors.textPrimary} />
            <Text style={styles.changeCoverText}>تغيير الغلاف</Text>
          </Pressable>

          {/* Logo */}
          <View style={styles.logoWrap}>
            <View style={styles.logoRing}>
              {logoImage ? (
                <Image source={{ uri: logoImage }} style={styles.logo} contentFit="cover" />
              ) : (
                <View style={[styles.logo, styles.logoPlaceholder]}>
                  <Store size={36} color={colors.primary} />
                </View>
              )}
            </View>
            <Pressable style={styles.logoCameraBtn} onPress={() => pickImage('logo')}>
              <Camera size={15} color="#fff" />
            </Pressable>
          </View>
        </View>

        <View style={styles.content}>
          {/* Basic Info */}
          <Text style={styles.sectionTitle}>المعلومات الأساسية</Text>
          <View style={styles.card}>
            <View>
              <Text style={styles.fieldLabel}>اسم المتجر</Text>
              <View style={styles.inputRow}>
                <Store size={18} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="أدخل اسم المتجر"
                  placeholderTextColor={colors.textMuted}
                  textAlign="right"
                />
              </View>
            </View>

            <View style={{ marginTop: spacing[4] }}>
              <Text style={styles.fieldLabel}>نوع المتجر</Text>
              <View style={styles.typeSeg}>
                {TYPES.map((t) => {
                  const active = type === t.value;
                  return (
                    <Pressable
                      key={t.value}
                      style={[styles.typeSegItem, active && styles.typeSegItemActive]}
                      onPress={() => selectType(t.value)}
                    >
                      <Text style={[styles.typeSegText, active && styles.typeSegTextActive]}>{t.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={{ marginTop: spacing[4] }}>
              <Text style={styles.fieldLabel}>التصنيفات (اختر واحداً أو أكثر)</Text>
              <View style={styles.tagsWrap}>
                {availableTags.length === 0 ? (
                  <Text style={styles.tagsEmpty}>لا توجد تصنيفات متاحة</Text>
                ) : (
                  availableTags.map((tag: Tag) => {
                    const active = tagIds.includes(tag.id);
                    return (
                      <Pressable
                        key={tag.id}
                        style={[styles.tagChip, active && styles.tagChipActive]}
                        onPress={() => toggleTag(tag.id)}
                      >
                        {active && <CheckCircle size={14} color="#fff" />}
                        <Text style={[styles.tagChipText, active && styles.tagChipTextActive]}>{tag.name}</Text>
                      </Pressable>
                    );
                  })
                )}
              </View>
            </View>
          </View>

          {/* Location */}
          <Text style={[styles.sectionTitle, { marginTop: spacing[6] }]}>الموقع والعنوان</Text>
          <View style={styles.card}>
            <View>
              <Text style={styles.fieldLabel}>العنوان بالتفصيل</Text>
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
            </View>

            <View style={{ marginTop: spacing[4] }}>
              <Text style={styles.fieldLabel}>الموقع على الخريطة</Text>
              <View style={styles.mapPreview}>
                <View style={styles.mapGridLine1} />
                <View style={styles.mapGridLine2} />
                <View style={styles.mapPinWrap}>
                  <MapPin size={36} color={colors.primary} fill={colors.primary} />
                </View>
                <Text style={styles.mapHint}>
                  {addressDetail.trim() ? addressDetail.trim() : 'لم يتم تحديد العنوان بعد'}
                </Text>
              </View>
            </View>
          </View>

          {/* Delivery Areas */}
          <>
              <Text style={[styles.sectionTitle, { marginTop: spacing[6] }]}>
                مناطق التوصيل
              </Text>
              <Text style={{ fontFamily: fontFamily.regular, fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'right', marginBottom: spacing[2], paddingHorizontal: spacing[1] }}>
                اختر القرى والأحياء التي يمكنك التوصيل إليها داخل مدينتك ({business?.area?.city ?? ''})
              </Text>
              <View style={[styles.card, { paddingVertical: 0, overflow: 'hidden' }]}>
                <View style={{ padding: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <TextInput
                    style={[styles.input, { height: 40, backgroundColor: '#FCF3DC' }]}
                    placeholder="بحث عن قرية أو حي..."
                    placeholderTextColor={colors.textMuted}
                    value={areaSearch}
                    onChangeText={setAreaSearch}
                    textAlign="right"
                  />
                </View>
                {cityVillages.length === 0 ? (
                  <Text style={{ fontFamily: fontFamily.regular, fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'center', padding: spacing[4] }}>
                    لا توجد مناطق متاحة
                  </Text>
                ) : (
                  <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled>
                    {filteredVillages.map((area: any, idx: number) => {
                      const isSelected = deliveryAreaIds.includes(area.id);
                      return (
                        <Pressable
                          key={area.id}
                          onPress={() => toggleDeliveryArea(area.id)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: spacing[3],
                            paddingHorizontal: spacing[4],
                            borderBottomWidth: idx === filteredVillages.length - 1 ? 0 : 1,
                            borderBottomColor: colors.border,
                            backgroundColor: isSelected ? 'rgba(230, 120, 30, 0.05)' : 'transparent',
                          }}
                        >
                          <Text style={{
                            fontFamily: fontFamily.medium,
                            fontSize: fontSizes.base,
                            color: isSelected ? colors.primary : colors.textPrimary,
                          }}>
                            {area.name}
                          </Text>
                          <View style={{
                            width: 20, height: 20, borderRadius: 4, borderWidth: 2,
                            borderColor: isSelected ? colors.primary : colors.border,
                            backgroundColor: isSelected ? colors.primary : 'transparent',
                            alignItems: 'center', justifyContent: 'center'
                          }}>
                            {isSelected && <CheckCircle size={14} color="#FFF" />}
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
          </>

          {/* Additional settings */}
          <Text style={[styles.sectionTitle, { marginTop: spacing[6] }]}>إعدادات إضافية</Text>
          <View style={styles.listCard}>
            <Pressable style={styles.listRow} onPress={() => setShowHoursModal(true)}>
              <ChevronLeft size={20} color={colors.textMuted} />
              <View style={styles.listRowMain}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listRowTitle}>أوقات العمل</Text>
                  <Text style={styles.listRowSub}>
                    {openTime} - {closeTime}
                  </Text>
                </View>
                <Clock size={20} color={colors.textMuted} />
              </View>
            </Pressable>
            <View style={styles.listDivider} />
            <Pressable style={styles.listRow} onPress={() => setShowPhoneModal(true)}>
              <ChevronLeft size={20} color={colors.textMuted} />
              <View style={styles.listRowMain}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listRowTitle}>رقم الهاتف</Text>
                  <Text style={styles.listRowSub}>{phone.trim() || 'لم يتم الإدخال'}</Text>
                </View>
                <Phone size={20} color={colors.textMuted} />
              </View>
            </Pressable>
            <View style={styles.listDivider} />
            <Pressable style={styles.listRow} onPress={() => router.push('/change-password')}>
              <ChevronLeft size={20} color={colors.textMuted} />
              <View style={styles.listRowMain}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listRowTitle}>تغيير كلمة المرور</Text>
                  <Text style={styles.listRowSub}>تحديث كلمة مرور حسابك</Text>
                </View>
                <KeyRound size={20} color={colors.textMuted} />
              </View>
            </Pressable>
          </View>

          {/* Save Button */}
          <View style={[styles.fabWrap, { marginTop: spacing[6], marginBottom: spacing[2] }]}>
            <Pressable
              style={[
                styles.saveBtn,
                (!isDirty || busy) && styles.saveBtnDisabled,
                saved && styles.saveBtnSuccess,
              ]}
              onPress={handleSave}
              disabled={!isDirty || busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : saved ? (
                <>
                  <CheckCircle size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>تم الحفظ بنجاح</Text>
                </>
              ) : (
                <>
                  <Save size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>حفظ التغييرات</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Logout */}
          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>تسجيل الخروج</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Save FAB removed from here */}

      {/* Working hours modal */}
      <TimeRangeModal
        visible={showHoursModal}
        open={openTime}
        close={closeTime}
        onClose={() => setShowHoursModal(false)}
        onSave={(o, c) => {
          setOpenTime(o);
          setCloseTime(c);
          setShowHoursModal(false);
        }}
      />

      {/* Phone modal */}
      <PhoneModal
        visible={showPhoneModal}
        value={phone}
        onClose={() => setShowPhoneModal(false)}
        onSave={(p) => {
          setPhone(p);
          setShowPhoneModal(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

/* ---------- Time range editor ---------- */

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];
const PERIODS = ['ص', 'م'] as const;

function parseTime(t: string): { h: string; m: string; p: string } {
  const match = t.match(/^(\d{1,2}):(\d{2})\s*(ص|م)$/);
  if (match) return { h: match[1].padStart(2, '0'), m: match[2], p: match[3] };
  return { h: '09', m: '00', p: 'ص' };
}

function TimePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { h, m, p } = parseTime(value);
  const set = (nh: string, nm: string, np: string) => onChange(`${nh}:${nm} ${np}`);
  return (
    <View style={{ marginBottom: spacing[4] }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.timePickerRow}>
        <Segment options={[...PERIODS]} value={p} onChange={(v) => set(h, m, v)} />
        <Text style={styles.timeColon}>:</Text>
        <Segment options={MINUTES} value={m} onChange={(v) => set(h, v, p)} scroll />
        <Text style={styles.timeColon}>:</Text>
        <Segment options={HOURS} value={h} onChange={(v) => set(v, m, p)} scroll />
      </View>
    </View>
  );
}

function Segment({
  options,
  value,
  onChange,
  scroll,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  scroll?: boolean;
}) {
  const Inner = (
    <View style={styles.segmentInner}>
      {options.map((o) => (
        <Pressable
          key={o}
          style={[styles.segmentItem, value === o && styles.segmentItemActive]}
          onPress={() => onChange(o)}
        >
          <Text style={[styles.segmentText, value === o && styles.segmentTextActive]}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
  if (scroll) {
    return (
      <ScrollView style={styles.segmentScroll} showsVerticalScrollIndicator={false}>
        {Inner}
      </ScrollView>
    );
  }
  return <View style={styles.segment}>{Inner}</View>;
}

function TimeRangeModal({
  visible,
  open,
  close,
  onClose,
  onSave,
}: {
  visible: boolean;
  open: string;
  close: string;
  onClose: () => void;
  onSave: (open: string, close: string) => void;
}) {
  const [o, setO] = useState(open);
  const [c, setC] = useState(close);
  useEffect(() => {
    if (visible) {
      setO(open);
      setC(close);
    }
  }, [visible, open, close]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} hitSlop={8}>
            <X size={22} color={colors.textMuted} />
          </Pressable>
          <Text style={styles.modalTitle}>أوقات العمل</Text>
          <View style={{ width: 22 }} />
        </View>
        <TimePicker label="وقت الفتح" value={o} onChange={setO} />
        <TimePicker label="وقت الإغلاق" value={c} onChange={setC} />
        <Pressable style={styles.modalSaveBtn} onPress={() => onSave(o, c)}>
          <Text style={styles.modalSaveText}>تم</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function PhoneModal({
  visible,
  value,
  onClose,
  onSave,
}: {
  visible: boolean;
  value: string;
  onClose: () => void;
  onSave: (v: string) => void;
}) {
  const [v, setV] = useState(value);
  useEffect(() => {
    if (visible) setV(value);
  }, [visible, value]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} hitSlop={8}>
            <X size={22} color={colors.textMuted} />
          </Pressable>
          <Text style={styles.modalTitle}>رقم الهاتف</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.inputRow}>
          <Phone size={18} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            value={v}
            onChangeText={setV}
            placeholder="+970 59-xxx-xxxx"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            textAlign="right"
            autoFocus
          />
        </View>
        <Pressable style={[styles.modalSaveBtn, { marginTop: spacing[5] }]} onPress={() => onSave(v)}>
          <Text style={styles.modalSaveText}>تم</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 8,
  elevation: 3,
};

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 20,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSizes.xl, fontFamily: fontFamily.bold, color: colors.primary },

  hero: { width: '100%', height: 220, position: 'relative', marginBottom: 52 },
  cover: { width: '100%', height: '100%' },
  coverPlaceholder: { backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  coverOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  changeCoverBtn: {
    position: 'absolute',
    top: spacing[3],
    left: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
  },
  changeCoverText: { fontSize: fontSizes.sm, fontFamily: fontFamily.semibold, color: colors.textPrimary },
  logoWrap: { position: 'absolute', bottom: -48, right: spacing[4], alignItems: 'center' },
  logoRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: colors.surface,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  logo: { width: '100%', height: '100%' },
  logoPlaceholder: { backgroundColor: '#fff3e0', alignItems: 'center', justifyContent: 'center' },
  logoCameraBtn: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },

  content: { paddingHorizontal: spacing[4] },
  sectionTitle: {
    fontSize: fontSizes.xl,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: spacing[3],
    marginRight: spacing[1],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[5],
    borderWidth: 1,
    borderColor: colors.border,
    ...CARD_SHADOW,
  },
  fieldLabel: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: spacing[2],
    marginRight: spacing[1],
  },
  inputRow: {
    flexDirection: 'row',
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
    fontSize: fontSizes.lg,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
    paddingVertical: 0,
    textAlign: 'right',
  },
  inputValue: {
    flex: 1,
    fontSize: fontSizes.lg,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
    textAlign: 'right',
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
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerItemActive: { backgroundColor: '#fff3e0' },
  pickerItemText: {
    fontSize: fontSizes.base,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  typeSeg: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  typeSegItem: { flex: 1, paddingVertical: spacing[3], alignItems: 'center', justifyContent: 'center' },
  typeSegItemActive: { backgroundColor: colors.primary },
  typeSegText: { fontSize: fontSizes.base, fontFamily: fontFamily.semibold, color: colors.textMuted },
  typeSegTextActive: { color: '#fff' },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  tagsEmpty: { fontSize: fontSizes.sm, fontFamily: fontFamily.regular, color: colors.textMuted },
  tagChip: {
    flexDirection: 'row',
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

  mapPreview: {
    height: 180,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#EFE9DA',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapGridLine1: {
    position: 'absolute',
    width: '140%',
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.6)',
    transform: [{ rotate: '-18deg' }],
    top: 60,
  },
  mapGridLine2: {
    position: 'absolute',
    width: 14,
    height: '160%',
    backgroundColor: 'rgba(255,255,255,0.6)',
    transform: [{ rotate: '12deg' }],
    left: '55%',
  },
  mapPinWrap: { marginBottom: spacing[2] },
  mapHint: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: spacing[4],
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: radius.full,
    paddingVertical: spacing[1],
    overflow: 'hidden',
  },

  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  listRow: { paddingHorizontal: spacing[4], paddingVertical: spacing[4], flexDirection: 'row', alignItems: 'center' },
  listRowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  listRowTitle: { fontSize: fontSizes.lg, fontFamily: fontFamily.regular, color: colors.textPrimary, textAlign: 'right' },
  listRowSub: { fontSize: fontSizes.xs, fontFamily: fontFamily.regular, color: colors.textMuted, textAlign: 'right', marginTop: 2 },
  listDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing[4] },

  logoutBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[5], marginTop: spacing[2] },
  logoutText: { fontSize: fontSizes.base, fontFamily: fontFamily.semibold, color: colors.error },

  fabWrap: { paddingHorizontal: 0 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    height: 56,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnDisabled: { opacity: 0.65 },
  saveBtnSuccess: { backgroundColor: colors.success, shadowColor: colors.success },
  saveBtnText: { fontSize: fontSizes.lg, fontFamily: fontFamily.bold, color: '#fff' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing[5],
    paddingBottom: spacing[8],
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[5] },
  modalTitle: { fontSize: fontSizes.xl, fontFamily: fontFamily.bold, color: colors.textPrimary },
  modalSaveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
  },
  modalSaveText: { fontSize: fontSizes.lg, fontFamily: fontFamily.bold, color: '#fff' },

  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[3],
  },
  timeColon: { fontSize: fontSizes.xl, fontFamily: fontFamily.bold, color: colors.textMuted },
  segment: { borderRadius: radius.md, overflow: 'hidden' },
  segmentScroll: { height: 120, borderRadius: radius.md },
  segmentInner: { gap: spacing[1] },
  segmentItem: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    alignItems: 'center',
    minWidth: 56,
  },
  segmentItemActive: { backgroundColor: '#fff3e0' },
  segmentText: { fontSize: fontSizes.lg, fontFamily: fontFamily.regular, color: colors.textMuted },
  segmentTextActive: { color: colors.primary, fontFamily: fontFamily.bold },
});
