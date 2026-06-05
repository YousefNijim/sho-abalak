import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, User, Phone, Bike, MapPin, Camera } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@shu/ui-components/native';
import { driversApi, areasApi, authApi } from '@shu/api-client';
import { colors, fontSizes, fontFamily, radius, spacing } from '../src/theme';

export default function EditProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: driver, isLoading } = useQuery({
    queryKey: ['driver-me'],
    queryFn: () => driversApi.me(),
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: () => areasApi.list(),
  });

  const [name, setName] = useState(driver?.user?.name || '');
  const [areaId, setAreaId] = useState(driver?.areaId || '');
  const [vehicleType, setVehicleType] = useState(driver?.vehicleType || 'MOTORCYCLE');
  
  // Phone OTP state
  const [phoneModal, setPhoneModal] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      // Update User profile (name)
      if (name !== driver?.user?.name) {
        await authApi.updateProfile({ name });
      }
      // Update Driver profile (area, vehicleType)
      if (areaId !== driver?.areaId || vehicleType !== driver?.vehicleType) {
        await driversApi.updateProfile({ areaId, vehicleType });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-me'] });
      Alert.alert('نجاح', 'تم تحديث الملف الشخصي بنجاح');
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err?.response?.data?.message || 'حدث خطأ أثناء التحديث');
    },
  });

  const sendOtpMutation = useMutation({
    mutationFn: () => authApi.otpRequest(newPhone),
    onSuccess: (res) => {
      setOtpSent(true);
      if (__DEV__) {
        Alert.alert('DEV: OTP Code', `رمز التحقق هو: ${res.devCode}`);
      }
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err?.response?.data?.message || 'فشل إرسال الرمز');
    },
  });

  const changePhoneMutation = useMutation({
    mutationFn: () => authApi.updateProfile({ phone: newPhone, otpCode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-me'] });
      setPhoneModal(false);
      setNewPhone('');
      setOtpCode('');
      setOtpSent(false);
      Alert.alert('نجاح', 'تم تغيير رقم الهاتف بنجاح');
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err?.response?.data?.message || 'رمز التحقق غير صحيح أو رقم الهاتف مستخدم');
    },
  });

  const handleSave = () => {
    if (!name.trim()) return Alert.alert('خطأ', 'الرجاء إدخال الاسم');
    if (!areaId) return Alert.alert('خطأ', 'الرجاء اختيار منطقة');
    updateProfileMutation.mutate();
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowRight size={28} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>تعديل الحساب</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Avatar Placeholder */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <User size={40} color={colors.primary} />
            <View style={styles.cameraBtn}>
              <Camera size={16} color="#fff" />
            </View>
          </View>
          <Text style={styles.avatarText}>تغيير الصورة</Text>
        </View>

        {/* Form */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>الاسم الكامل</Text>
          <View style={styles.inputWrap}>
            <TextInput style={styles.input} value={name} onChangeText={setName} textAlign="right" />
            <User size={20} color={colors.textMuted} />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>رقم الهاتف</Text>
          <Pressable style={styles.phoneField} onPress={() => setPhoneModal(true)}>
            <Text style={styles.phoneText}>{driver?.user?.phone}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
              <Text style={styles.changePhoneText}>تغيير</Text>
              <Phone size={20} color={colors.textMuted} />
            </View>
          </Pressable>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>منطقة العمل</Text>
          <View style={styles.inputWrap}>
            {Platform.OS === 'web' ? (
              <select 
                value={areaId} 
                onChange={(e) => setAreaId(e.target.value)}
                style={{ flex: 1, border: 'none', outline: 'none', backgroundColor: 'transparent', textAlign: 'right', fontFamily: fontFamily.medium, fontSize: 16 }}
              >
                {(areas as any[]).map((a) => <option key={a.id} value={a.id}>{a.city} - {a.name}</option>)}
              </select>
            ) : (
              // Simple text for mobile placeholder, normally use a Picker
              <TextInput style={styles.input} value={areas.find((a: any) => a.id === areaId)?.name || ''} editable={false} textAlign="right" />
            )}
            <MapPin size={20} color={colors.textMuted} />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>نوع المركبة</Text>
          <View style={styles.vehicleOptions}>
            {[
              { id: 'MOTORCYCLE', label: 'دراجة نارية' },
              { id: 'CAR', label: 'سيارة' },
              { id: 'BICYCLE', label: 'دراجة هوائية' }
            ].map(v => (
              <Pressable key={v.id} style={[styles.vehicleOption, vehicleType === v.id && styles.vehicleOptionActive]} onPress={() => setVehicleType(v.id)}>
                <Text style={[styles.vehicleOptionText, vehicleType === v.id && styles.vehicleOptionTextActive]}>{v.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[4] }]}>
        <Button title="حفظ التعديلات" onPress={handleSave} loading={updateProfileMutation.isPending} />
      </View>

      {/* Phone OTP Modal */}
      <Modal visible={phoneModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + spacing[4] }]}>
            <Text style={styles.modalTitle}>تغيير رقم الهاتف</Text>
            {!otpSent ? (
              <>
                <Text style={styles.modalDesc}>أدخل رقم هاتفك الجديد لنرسل لك رمز التحقق.</Text>
                <TextInput style={styles.modalInput} placeholder="رقم الهاتف الجديد" value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" textAlign="center" />
                <Button title="إرسال الرمز" onPress={() => sendOtpMutation.mutate()} loading={sendOtpMutation.isPending} disabled={!newPhone} />
              </>
            ) : (
              <>
                <Text style={styles.modalDesc}>أدخل الرمز المكون من 4 أرقام الذي أرسلناه إلى {newPhone}.</Text>
                <TextInput style={styles.modalInput} placeholder="----" value={otpCode} onChangeText={setOtpCode} keyboardType="number-pad" textAlign="center" maxLength={4} />
                <Button title="تأكيد التغيير" onPress={() => changePhoneMutation.mutate()} loading={changePhoneMutation.isPending} disabled={otpCode.length < 4} />
              </>
            )}
            <Pressable style={styles.modalCancelBtn} onPress={() => { setPhoneModal(false); setOtpSent(false); setNewPhone(''); setOtpCode(''); }}>
              <Text style={styles.modalCancelText}>إلغاء</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing[4], paddingBottom: spacing[3], backgroundColor: '#FCF3DC', zIndex: 50 },
  headerTitle: { fontFamily: fontFamily.bold, fontSize: 20, color: colors.primary, flex: 1, textAlign: 'right' },
  backBtn: { padding: spacing[2] },
  scrollContent: { padding: spacing[4], paddingBottom: 100, gap: spacing[5] },
  avatarWrap: { alignItems: 'center', marginBottom: spacing[2] },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.primary, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.background },
  avatarText: { fontFamily: fontFamily.medium, fontSize: fontSizes.sm, color: colors.primary, marginTop: spacing[2] },
  formGroup: { gap: spacing[2] },
  label: { fontFamily: fontFamily.bold, fontSize: fontSizes.sm, color: colors.textPrimary, textAlign: 'right' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing[3], height: 50 },
  input: { flex: 1, fontFamily: fontFamily.medium, fontSize: fontSizes.base, color: colors.textPrimary, paddingHorizontal: spacing[2] },
  phoneField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing[3], height: 50 },
  phoneText: { fontFamily: fontFamily.bold, fontSize: fontSizes.base, color: colors.textPrimary },
  changePhoneText: { fontFamily: fontFamily.bold, fontSize: fontSizes.sm, color: colors.primary },
  vehicleOptions: { flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap', justifyContent: 'flex-end' },
  vehicleOption: { paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  vehicleOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  vehicleOptionText: { fontFamily: fontFamily.medium, fontSize: fontSizes.sm, color: colors.textMuted },
  vehicleOptionTextActive: { color: colors.white, fontFamily: fontFamily.bold },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: spacing[4], paddingTop: spacing[3], backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing[5], gap: spacing[4] },
  modalTitle: { fontFamily: fontFamily.bold, fontSize: fontSizes.xl, color: colors.textPrimary, textAlign: 'center' },
  modalDesc: { fontFamily: fontFamily.regular, fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'center' },
  modalInput: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing[3], fontFamily: fontFamily.bold, fontSize: 24, letterSpacing: 4 },
  modalCancelBtn: { alignItems: 'center', padding: spacing[3] },
  modalCancelText: { fontFamily: fontFamily.bold, fontSize: fontSizes.base, color: colors.error },
});
