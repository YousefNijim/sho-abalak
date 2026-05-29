import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Platform, TextInput, KeyboardAvoidingView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Shield,
  CheckCircle2,
  LockKeyhole,
} from 'lucide-react-native';
import { colors, fontSizes, fontFamily, spacing, radius } from '../../../src/theme';

export default function ChangePasswordScreen() {
  const router = useRouter();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSave = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('خطأ', 'يرجى تعبئة جميع الحقول');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('خطأ', 'كلمة المرور الجديدة غير متطابقة');
      return;
    }
    
    Alert.alert(
      'تم بنجاح!',
      'لقد تم تغيير كلمة مرورك بنجاح. يمكنك الآن استخدامها لتسجيل الدخول.',
      [{ text: 'إغلاق', onPress: () => router.back() }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <ArrowRight size={24} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>تغيير كلمة المرور</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Illustration Section */}
          <View style={styles.hero}>
            <View style={styles.iconCircle}>
              <LockKeyhole size={48} color={colors.primary} strokeWidth={1.5} />
            </View>
            <Text style={styles.heroTitle}>تأمين حسابك</Text>
            <Text style={styles.heroDesc}>يرجى اختيار كلمة مرور قوية وفريدة لضمان سلامة بياناتك.</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Current Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>كلمة المرور الحالية</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showCurrent}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  textAlign="right"
                />
                <Pressable style={styles.eyeBtn} onPress={() => setShowCurrent(!showCurrent)}>
                  {showCurrent ? <EyeOff size={20} color={colors.textMuted} /> : <Eye size={20} color={colors.textMuted} />}
                </Pressable>
              </View>
            </View>

            {/* New Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>كلمة المرور الجديدة</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showNew}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  textAlign="right"
                />
                <Pressable style={styles.eyeBtn} onPress={() => setShowNew(!showNew)}>
                  {showNew ? <EyeOff size={20} color={colors.textMuted} /> : <Eye size={20} color={colors.textMuted} />}
                </Pressable>
              </View>
              <Text style={styles.hintText}>يجب أن تحتوي على ٨ أحرف على الأقل</Text>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>تأكيد كلمة المرور الجديدة</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  textAlign="right"
                />
                <Pressable style={styles.eyeBtn} onPress={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? <EyeOff size={20} color={colors.textMuted} /> : <Eye size={20} color={colors.textMuted} />}
                </Pressable>
              </View>
            </View>

            {/* Security Hint */}
            <View style={styles.securityHint}>
              <View style={styles.securityIconWrap}>
                <Shield size={20} color={colors.secondary} />
              </View>
              <View style={styles.securityContent}>
                <Text style={styles.securityTitle}>نصيحة أمان</Text>
                <Text style={styles.securityBody}>تجنب استخدام كلمات مرور سهلة التخمين مثل تاريخ ميلادك أو أرقام متسلسلة.</Text>
              </View>
            </View>

            {/* Submit */}
            <Pressable style={styles.submitBtn} onPress={handleSave}>
              <Text style={styles.submitBtnText}>حفظ التغييرات</Text>
              <CheckCircle2 size={24} color={colors.white} />
            </Pressable>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    height: 64,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...(Platform.OS === 'web' ? { position: 'sticky', top: 0, zIndex: 10 } : {}),
  },
  headerRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing[2],
  },
  iconBtn: {
    padding: spacing[1],
  },
  headerTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSizes.xl,
    color: colors.primary,
  },
  content: {
    padding: spacing[4],
    paddingBottom: spacing[10],
  },
  hero: {
    alignItems: 'center',
    marginVertical: spacing[6],
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  heroTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSizes.xl,
    color: colors.textPrimary,
    marginBottom: spacing[1],
  },
  heroDesc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.base,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing[4],
  },
  form: {
    gap: spacing[5],
  },
  inputGroup: {
    gap: spacing[1],
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    textAlign: 'right',
    marginRight: spacing[1],
  },
  inputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    width: '100%',
    height: 52,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingRight: 48, // space for eye icon
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
  },
  eyeBtn: {
    position: 'absolute',
    left: 0,
    height: '100%',
    paddingHorizontal: spacing[4],
    justifyContent: 'center',
  },
  hintText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing[1],
  },
  securityHint: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing[4],
    flexDirection: 'row-reverse',
    gap: spacing[3],
    alignItems: 'flex-start',
    marginTop: spacing[2],
  },
  securityIconWrap: {
    backgroundColor: colors.secondary + '20',
    padding: spacing[2],
    borderRadius: radius.sm,
  },
  securityContent: {
    flex: 1,
  },
  securityTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  securityBody: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
    lineHeight: 20,
    marginTop: 2,
  },
  submitBtn: {
    width: '100%',
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[6],
    ...Platform.select({
      ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
      web: { boxShadow: `0 4px 12px ${colors.primary}40` },
    }),
  },
  submitBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.lg,
    color: colors.white,
  },
});
