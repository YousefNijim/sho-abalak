import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View, Pressable, Platform, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';
import { useAuthStore } from '../../src/stores/auth.store';
import { authApi } from '@shu/api-client';
import { ArrowRight, MessageSquareCode, CheckCircle2 } from 'lucide-react-native';
import { Image } from 'expo-image';

export default function Otp() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  
  const [digits, setDigits] = useState(['', '', '', '']);
  const [seconds, setSeconds] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const refs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (seconds === 0) return;
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const setDigit = (i: number, v: string) => {
    const next = [...digits];
    next[i] = v.slice(-1);
    setDigits(next);
    if (v && i < 3) refs.current[i + 1]?.focus();
    if (!v && i > 0) refs.current[i - 1]?.focus();
  };

  const handleVerify = async () => {
    const code = digits.join('');
    if (code.length < 4) return;
    setError('');
    setLoading(true);
    try {
      const result = await authApi.otpVerify(user?.phone ?? '', code);
      if (!result.verified) {
        setError('الكود غير صحيح، يرجى المحاولة مرة أخرى');
        return;
      }
      router.replace('/sections');
    } catch {
      setError('الكود غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Decorative Background Elements */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      {/* Top AppBar */}
      <View style={[styles.appBar, { paddingTop: Platform.OS === 'ios' ? insets.top || spacing[4] : spacing[4] }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowRight size={24} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <MessageSquareCode size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>تحقق من هاتفك</Text>
          <Text style={styles.subtitle}>
            أرسلنا كوداً مكوّناً من 4 أرقام إلى{'\n'}
            <Text style={styles.phoneHighlight}>{user?.phone || 'رقمك'}</Text>
          </Text>
        </View>

        {/* Verification Card */}
        <View style={styles.card}>
          <View style={styles.otpRow}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={(r) => { refs.current[i] = r; }}
                style={[
                  styles.otpBox, 
                  !!d && styles.otpBoxFilled,
                  error ? styles.otpBoxError : null
                ]}
                keyboardType="number-pad"
                maxLength={1}
                value={d}
                onChangeText={(v) => setDigit(i, v)}
                textAlign="center"
                autoFocus={i === 0}
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Submit Button */}
          <Pressable 
            style={[styles.submitBtn, (digits.join('').length < 4 || loading) && styles.submitBtnDisabled]}
            onPress={handleVerify}
            disabled={digits.join('').length < 4 || loading}
          >
            {loading ? (
              <ActivityIndicator color="#4e2200" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>تأكيد الرمز</Text>
                <CheckCircle2 size={20} color="#4e2200" />
              </>
            )}
          </Pressable>

          <Pressable 
            style={styles.resendBtn}
            disabled={seconds > 0}
            onPress={() => setSeconds(60)} // In real app: trigger resend API
          >
            <Text style={[styles.resendText, seconds > 0 && styles.resendTextDisabled]}>
              {seconds > 0 ? `إعادة إرسال بعد ${seconds} ثانية` : 'إعادة إرسال الكود'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Visual Decoration */}
      <View style={[styles.decorationWrap, { paddingBottom: insets.bottom + spacing[4] }]}>
        <Image 
          source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlsqdL2okG3UAb0LNFcpDvuhV8FuenzbYSkaaHCQYbZtuKvPUXnJ5_fg16BZXFA26McnF9m2ZGvxJmPTX8w949vaFl_vjqlEAwXcSb2JdznUQqEETy2KpzDKzakaOzrdt0-czTBRsKRoa6b4MCdaXXEXORs-_XvkNgcIfITY6X1-rMnbfkw7fOMGUHmD0vcJlQlWB02OdqL-3O7tgFTv15DRyRAshRvFNtxRH3m6wFTlADUCxieOhLhg8mcNsfjr-YLep7XyGssdTj' }} 
          style={styles.decorationImage}
          contentFit="contain"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCF3DC', // background-cream
  },
  blob1: {
    position: 'absolute',
    top: '10%',
    left: '-20%',
    width: 256,
    height: 256,
    backgroundColor: '#009ee8', // tertiary-container
    opacity: 0.1,
    borderRadius: 128,
    ...Platform.select({
      ios: { shadowColor: '#009ee8', shadowOpacity: 0.1, shadowRadius: 30 },
      web: { filter: 'blur(3xl)' }
    }),
  },
  blob2: {
    position: 'absolute',
    bottom: '20%',
    right: '-10%',
    width: 300,
    height: 300,
    backgroundColor: '#e6781e', // primary-container
    opacity: 0.1,
    borderRadius: 150,
    ...Platform.select({
      ios: { shadowColor: '#e6781e', shadowOpacity: 0.1, shadowRadius: 30 },
      web: { filter: 'blur(3xl)' }
    }),
  },

  // App Bar
  appBar: {
    flexDirection: 'row-reverse',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    zIndex: 50,
  },
  backBtn: {
    padding: spacing[2],
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 20,
  },

  content: {
    flex: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[6],
  },
  
  // Header
  header: { 
    alignItems: 'center', 
    marginBottom: spacing[10], 
    textAlign: 'center' 
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffdbc7', // primary-fixed
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[6],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  title: {
    fontSize: 28, // headline-lg
    fontFamily: fontFamily.bold,
    color: colors.primary,
    marginBottom: spacing[3],
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fontFamily.regular,
    color: '#564337', // on-surface-variant
    textAlign: 'center',
    lineHeight: 24,
  },
  phoneHighlight: {
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },

  // Card
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // glass-card
    borderRadius: radius.xl,
    padding: spacing[6],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 4 },
      web: { backdropFilter: 'blur(10px)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }
    }),
  },
  
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  otpBox: {
    flex: 1,
    height: 64,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(229, 224, 213, 1)', // border-beige
    backgroundColor: '#FFFFFF',
    fontSize: 28,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: {width: 0, height: 2} },
      android: { elevation: 2 },
    }),
  },
  otpBoxFilled: { 
    borderColor: colors.primary, 
    borderWidth: 2,
    backgroundColor: '#fffaf5',
  },
  otpBoxError: {
    borderColor: colors.error,
  },

  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
    fontFamily: fontFamily.medium,
    marginBottom: spacing[4],
    marginTop: -spacing[2],
  },

  // Submit Button
  submitBtn: {
    width: '100%',
    height: 52,
    backgroundColor: 'rgba(230, 120, 30, 1)', // primary-container
    borderRadius: radius.lg,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#4e2200', // on-primary-container
    fontFamily: fontFamily.bold,
    fontSize: 16,
  },

  resendBtn: {
    marginTop: spacing[6],
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  resendText: {
    color: colors.primary,
    fontFamily: fontFamily.bold,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  resendTextDisabled: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    textDecorationLine: 'none',
  },

  // Visual Decoration
  decorationWrap: {
    marginTop: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.15,
  },
  decorationImage: {
    width: '100%',
    height: 96,
  },
});
