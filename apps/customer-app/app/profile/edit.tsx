import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ArrowRight, Camera, Check, Mail, Phone, ShieldCheck, User } from 'lucide-react-native';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';
import { authApi } from '@shu/api-client';
import { useAuthStore } from '../../src/stores/auth.store';
import { uploadImage, imageUrl } from '../../src/lib/upload';

export default function EditProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [imagePath, setImagePath] = useState<string | null>((user?.imageUrl as string) ?? null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Phone-verification flow (only relevant when the phone changed).
  const phoneChanged = phone.trim() !== (user?.phone ?? '');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpBusy, setOtpBusy] = useState(false);

  const notify = (title: string, msg?: string) => {
    if (Platform.OS === 'web') window.alert(msg ? `${title}\n${msg}` : title);
    else Alert.alert(title, msg);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      notify('تنبيه', 'نحتاج صلاحية الوصول للصور لتغيير صورتك');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    try {
      setUploading(true);
      const url = await uploadImage(result.assets[0].uri);
      setImagePath(url);
    } catch (e) {
      notify('فشل رفع الصورة', (e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const sendOtp = async () => {
    try {
      setOtpBusy(true);
      const res = await authApi.otpRequest(phone.trim());
      setOtpSent(true);
      setPhoneVerified(false);
      // Dev builds return a fixed code; surface it so the flow is testable.
      notify('تم إرسال رمز التحقق', res.devCode ? `رمز التطوير: ${res.devCode}` : undefined);
    } catch (e) {
      notify('تعذّر إرسال الرمز', (e as Error).message);
    } finally {
      setOtpBusy(false);
    }
  };

  const verifyOtp = async () => {
    try {
      setOtpBusy(true);
      const res = await authApi.otpVerify(phone.trim(), otpCode.trim());
      if (res.verified) {
        setPhoneVerified(true);
        notify('تم التحقق', 'تم التحقق من رقم الهاتف الجديد');
      } else {
        notify('رمز غير صحيح', 'الرجاء التأكد من الرمز وإعادة المحاولة');
      }
    } catch (e) {
      notify('فشل التحقق', (e as Error).message);
    } finally {
      setOtpBusy(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      notify('تنبيه', 'الاسم لا يمكن أن يكون فارغاً');
      return;
    }
    if (phoneChanged && !phoneVerified) {
      notify('تنبيه', 'يجب التحقق من رقم الهاتف الجديد قبل الحفظ');
      return;
    }
    try {
      setSaving(true);
      const updated = await authApi.updateProfile({
        name: name.trim(),
        email: email.trim() || undefined,
        imageUrl: imagePath ?? undefined,
        ...(phoneChanged ? { phone: phone.trim(), otpCode: otpCode.trim() } : {}),
      });
      setUser(updated as any);
      notify('تم الحفظ', 'تم تحديث ملفك الشخصي بنجاح');
      router.back();
    } catch (e: any) {
      const msg = e?.response?.data?.message || (e as Error).message || 'فشل حفظ التغييرات';
      notify('خطأ', Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setSaving(false);
    }
  };

  const avatarUri = imagePath
    ? imageUrl(imagePath)
    : 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUSZfCM-tLbRtzPFjdltok_AvJFIYQYCOPLdPX3NXaaHNm0KCEco5A-ZZNR_Z_lWA2hlTnpqeUjmJUmz65hX4mYw5FBHXmVbs7zsCBEyzilWML6gn7DafAdoxKKzkToFelHt5_G23OFo5r9CC3SElLF_KoaB8U_7ReJsfkoSALty4a9cQSkEzEtIUcNtJFue5y-Vbye8IUG7uCkCBstYJZoHAipmEhePvayLQBPhgO7I6GIaPTIlv2aKhaPfLJBREvaDwccwXANlib';

  const busy = saving || uploading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowRight size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>تعديل الملف الشخصي</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <Image source={{ uri: avatarUri ?? undefined }} style={styles.avatar} contentFit="cover" />
            {uploading && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
            <Pressable style={styles.cameraBtn} onPress={pickImage} disabled={busy}>
              <Camera size={16} color="#fff" />
            </Pressable>
          </View>
          <Text style={styles.changePhotoHint}>اضغط على الكاميرا لتغيير الصورة</Text>
        </View>

        {/* Name */}
        <Text style={styles.label}>الاسم</Text>
        <View style={styles.inputRow}>
          <User size={20} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="اسمك الكامل"
            placeholderTextColor={colors.textMuted}
            textAlign="right"
          />
        </View>

        {/* Email */}
        <Text style={styles.label}>البريد الإلكتروني</Text>
        <View style={styles.inputRow}>
          <Mail size={20} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="example@email.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            textAlign="right"
          />
        </View>

        {/* Phone */}
        <Text style={styles.label}>رقم الهاتف</Text>
        <View style={styles.inputRow}>
          <Phone size={20} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={(t) => {
              setPhone(t);
              setOtpSent(false);
              setPhoneVerified(false);
              setOtpCode('');
            }}
            placeholder="05xxxxxxxx"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            textAlign="right"
          />
          {phoneChanged && phoneVerified && <Check size={20} color={colors.success} />}
        </View>

        {/* Phone verification flow */}
        {phoneChanged && !phoneVerified && (
          <View style={styles.verifyBox}>
            <View style={styles.verifyHeader}>
              <ShieldCheck size={18} color={colors.primary} />
              <Text style={styles.verifyTitle}>يجب التحقق من الرقم الجديد</Text>
            </View>
            {!otpSent ? (
              <Pressable style={styles.verifyBtn} onPress={sendOtp} disabled={otpBusy}>
                {otpBusy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.verifyBtnText}>إرسال رمز التحقق</Text>
                )}
              </Pressable>
            ) : (
              <>
                <TextInput
                  style={styles.otpInput}
                  value={otpCode}
                  onChangeText={setOtpCode}
                  placeholder="أدخل الرمز المكوّن من 4 أرقام"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={4}
                  textAlign="center"
                />
                <View style={styles.otpActions}>
                  <Pressable style={[styles.verifyBtn, { flex: 1 }]} onPress={verifyOtp} disabled={otpBusy || otpCode.length < 4}>
                    {otpBusy ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.verifyBtnText}>تأكيد الرمز</Text>
                    )}
                  </Pressable>
                  <Pressable style={styles.resendBtn} onPress={sendOtp} disabled={otpBusy}>
                    <Text style={styles.resendText}>إعادة الإرسال</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Sticky save */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing[3]) + spacing[2] }]}>
        <Pressable
          style={[styles.saveBtn, busy && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={busy}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Check size={22} color="#fff" />
              <Text style={styles.saveBtnText}>حفظ التغييرات</Text>
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
    backgroundColor: colors.background,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fontFamily.bold, fontSize: 18, color: colors.textPrimary },
  scroll: { paddingHorizontal: spacing[4], paddingTop: spacing[4] },
  avatarSection: { alignItems: 'center', marginBottom: spacing[6] },
  avatarWrap: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: '#ffdbc7',
    overflow: 'visible',
    position: 'relative',
  },
  avatar: { width: '100%', height: '100%', borderRadius: 52 },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 52,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  changePhotoHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: spacing[3],
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: spacing[2],
    marginTop: spacing[4],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[4],
    height: 56,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    height: '100%',
  },
  verifyBox: {
    marginTop: spacing[3],
    backgroundColor: colors.primary + '0D',
    borderWidth: 1,
    borderColor: colors.primary + '40',
    borderRadius: radius.md,
    padding: spacing[4],
    gap: spacing[3],
  },
  verifyHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  verifyTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  verifyBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnText: { fontFamily: fontFamily.bold, fontSize: fontSizes.base, color: '#fff' },
  otpInput: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 52,
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    letterSpacing: 6,
  },
  otpActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  resendBtn: { paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  resendText: { fontFamily: fontFamily.medium, fontSize: fontSizes.sm, color: colors.primary },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  saveBtn: {
    height: 54,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  saveBtnText: { fontFamily: fontFamily.bold, fontSize: 16, color: '#fff' },
});
