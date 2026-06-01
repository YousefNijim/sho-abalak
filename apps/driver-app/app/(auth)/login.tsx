import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input } from '@shu/ui-components/native';
import { colors, fontSizes, fontFamily, spacing } from '../../src/theme';
import { useAuthStore } from '../../src/stores/auth.store';
import { Image } from 'expo-image';
import { Phone, Lock, Eye, EyeOff, ArrowRight, UserPlus } from 'lucide-react-native';

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const login = useAuthStore((s) => s.login);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!phone || !password) {
      setError('الرجاء إدخال رقم الهاتف وكلمة المرور');
      return;
    }
    setLoading(true);
    try {
      const formattedPhone = phone.startsWith('5') ? `0${phone}` : phone;
      await login({ phone: formattedPhone, password });
      router.replace('/(tabs)');
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'بيانات الدخول غير صحيحة';
      setError(Array.isArray(msg) ? msg.join(' ، ') : String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Background Shapes */}
      <View style={styles.bgBlobRight} />
      <View style={styles.bgBlobLeft} />

      {/* Top AppBar */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <Image
          source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuABdyES4rRxiMO8pR8TzWPXCSE8vbRZptSrzrxBXrXzwo4wGPMI80g0h5g62fwYCBXUBJ8xL6dB_xvxW0TXf4PlvaOTr0lz54kMiYUQqbfqm3qxRN1RqQZhylSZ6xWpbnq79xSHomiDqHHXUL25C5hhnhHp3NAJiOi3dO_ZiML71eCR3QMrsEtaaKQxH8wqTWZc0NFTXLIkFFiCXPRPulFOz3PlurONuy9aiBwpocrMEGS8B54Sxzu0AEtUanfWuHRzCxOxcVpijkLY' }}
          style={styles.logo}
          contentFit="contain"
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing[8] }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrap}>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.title}>مرحباً بك، كابتن</Text>
            <Text style={styles.subtitle}>سجل دخولك لتبدأ استقبال طلبات التوصيل بكل سهولة وموثوقية</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Phone Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>رقم الهاتف المحمول</Text>
              <View style={styles.inputWrap}>
                <View style={styles.phonePrefix}>
                  <Text style={[styles.phonePrefixText, { writingDirection: 'ltr' }]}>+970</Text>
                </View>
                <Input
                  placeholder="59x xxx xxxx"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  style={styles.phoneInput}
                  rightIcon={<Phone size={20} color={colors.textMuted} />}
                  textAlign="left"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>كلمة المرور</Text>
                <Pressable>
                  <Text style={styles.forgotText}>نسيت كلمة المرور؟</Text>
                </Pressable>
              </View>
              <Input
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                rightIcon={<Lock size={20} color={colors.textMuted} />}
                leftIcon={
                  <Pressable onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOff size={20} color={colors.textMuted} />
                    ) : (
                      <Eye size={20} color={colors.textMuted} />
                    )}
                  </Pressable>
                }
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Login Button */}
            <Button
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.loginBtn}
            >
              <View style={styles.btnContent}>
                <ArrowRight size={20} color={colors.white} />
                <Text style={styles.btnText}>دخول</Text>
              </View>
            </Button>
          </View>

          {/* Registration Section */}
          <View style={styles.registerSection}>
            <View style={styles.dividerWrap}>
              <View style={styles.divider} />
              <View style={styles.dividerTextWrap}>
                <Text style={styles.dividerText}>ليس لديك حساب؟</Text>
              </View>
            </View>

            <Button
              variant="secondary"
              onPress={() => {}}
              style={styles.registerBtn}
            >
              <View style={styles.btnContent}>
                <UserPlus size={20} color={colors.primary} />
                <Text style={[styles.btnText, { color: colors.primary }]}>سجل كشريك توصيل جديد</Text>
              </View>
            </Button>
          </View>

          {/* Footer Info */}
          <View style={styles.footer}>
            <View style={styles.dotsRow}>
              <View style={[styles.dot, { backgroundColor: colors.secondary }]} />
              <View style={[styles.dot, { backgroundColor: '#e6781e' }]} />
              <View style={[styles.dot, { backgroundColor: colors.textPrimary }]} />
            </View>
            <Text style={styles.footerText}>Heritage Pulse v2.4 - نظام الكابتن</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCF3DC', // background-cream
    position: 'relative',
  },
  bgBlobRight: {
    position: 'absolute',
    top: '-10%',
    right: '-10%',
    width: '40%',
    height: '40%',
    backgroundColor: 'rgba(230, 120, 30, 0.05)', // primary-container/5
    borderRadius: 999,
    ...Platform.select({
      ios: { shadowColor: '#e6781e', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.1, shadowRadius: 30 },
      android: { elevation: 0 }, // Adjust for Android blur
      web: { filter: 'blur(40px)' },
    }),
  },
  bgBlobLeft: {
    position: 'absolute',
    bottom: '-5%',
    left: '-10%',
    width: '50%',
    height: '50%',
    backgroundColor: 'rgba(41, 106, 67, 0.05)', // secondary/5
    borderRadius: 999,
    ...Platform.select({
      ios: { shadowColor: '#296a43', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.1, shadowRadius: 30 },
      android: { elevation: 0 },
      web: { filter: 'blur(40px)' },
    }),
  },
  header: {
    height: 64 + (Platform.OS === 'ios' ? 44 : 0),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    backgroundColor: '#FCF3DC', // Sticky top nav matches bg
    zIndex: 50,
  },
  logo: {
    height: 40,
    width: 200,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
  },
  contentWrap: {
    flex: 1,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  title: {
    fontFamily: fontFamily.bold, // headline-lg-mobile
    fontSize: 26,
    color: colors.textPrimary, // on-surface
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 15, // body-base
    color: colors.textMuted, // on-surface-variant
    textAlign: 'center',
    maxWidth: '80%',
  },
  form: {
    gap: spacing[5],
  },
  inputGroup: {
    gap: spacing[1],
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[1],
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 13, // label-md
    color: colors.textMuted,
    textAlign: 'right',
    paddingHorizontal: spacing[1],
  },
  forgotText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.secondary,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phonePrefix: {
    height: 52,
    borderWidth: 1.5,
    borderLeftWidth: 0,
    borderColor: 'rgba(229, 224, 213, 1)', // border-beige
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
  },
  phonePrefixText: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.primary,
  },
  phoneInput: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 1,
    borderRightColor: 'rgba(229, 224, 213, 1)',
  },
  errorText: {
    color: colors.error,
    fontSize: fontSizes.sm,
    fontFamily: fontFamily.regular,
    textAlign: 'right',
  },
  loginBtn: {
    marginTop: spacing[4],
    backgroundColor: '#e6781e', // primary-container
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  btnText: {
    fontFamily: fontFamily.bold, // button-text
    fontSize: 16,
    color: colors.white, // on-primary
  },
  registerSection: {
    marginTop: spacing[8],
    width: '100%',
  },
  dividerWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[6],
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(229, 224, 213, 1)', // border-beige
  },
  dividerTextWrap: {
    position: 'absolute',
    backgroundColor: '#FCF3DC', // Match page bg
    paddingHorizontal: spacing[4],
  },
  dividerText: {
    fontFamily: fontFamily.medium,
    fontSize: 11, // label-sm
    color: colors.textMuted,
  },
  registerBtn: {
    borderColor: colors.secondary,
    borderWidth: 1.5,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: spacing[8],
    alignItems: 'center',
    gap: spacing[2],
    opacity: 0.6,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footerText: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
});
