import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View, TextInput, Pressable, Platform, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';
import { useAuthStore } from '../../src/stores/auth.store';
import { Image } from 'expo-image';
import { Store, Eye, EyeOff, LogIn, Phone, Lock, Headset } from 'lucide-react-native';

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const login = useAuthStore((s) => s.login);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Alert.alert is a no-op on react-native-web — fall back to window.alert there.
  const notify = (title: string, message?: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(message ? `${title}\n\n${message}` : title);
    } else {
      Alert.alert(title, message);
    }
  };

  const SUPPORT_MSG =
    'لإعادة تعيين كلمة المرور، يرجى التواصل مع إدارة المنصة وسيتم تعيين كلمة مرور جديدة لمتجرك.\n\nالدعم: 0599-000-000';

  const handleForgotPassword = () => notify('نسيت كلمة المرور؟', SUPPORT_MSG);
  const handleSupport = () => notify('تواصل مع الدعم', SUPPORT_MSG);

  const handleLogin = async () => {
    setError('');
    if (!phone || !password) {
      setError('الرجاء إدخال رقم الهاتف وكلمة المرور');
      return;
    }
    setLoading(true);
    try {
      await login({ phone, password });
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
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: Platform.OS === 'ios' ? insets.top : spacing[4], paddingBottom: insets.bottom + spacing[4] }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Image 
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAXuQi8cCjNhInAckU6ZGfReeEVDE-QncUwFc5lZJSOYf-jECJM8oXTZhaSpmyd2mfJyg52li6yzXeHVGS2EPitywomRgSJJrqDKFFNPn6bfWLdnAx6R5AWKQpnb-qGp56VvEyDBzI9Ie_qKKVFo41rZ8xt2wjW7ezVX9AYf0W7P92N4vWDb58J2IzdMaB2utzswzJPkgSqKp_zmx2USg7KcRAtxEI4PzeN61gh8G83HFukREqRkS8z8_djgZKgAvq-kemaMGmNi4ot' }} 
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={styles.headerText}>مرحباً بك، مدير المتجر</Text>
        </View>

        {/* Main Content Area */}
        <View style={styles.main}>
          <View style={styles.loginCard}>
            
            {/* Branding/Identity */}
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Store size={32} color={colors.primary} />
              </View>
              <Text style={styles.title}>تسجيل الدخول للمتجر</Text>
              <Text style={styles.subtitle}>يرجى إدخال بياناتك للمتابعة</Text>
            </View>

            <View style={styles.form}>
              {/* Phone Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>رقم الهاتف</Text>
                <View style={styles.phoneField}>
                  <Phone size={20} color="#6B7280" />
                  <View style={styles.phonePrefix}>
                    <Text style={styles.prefixText}>970+</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="59XXXXXXX"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    textAlign="left"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>كلمة المرور</Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.inputIconRight}>
                    <Lock size={20} color="#6B7280" />
                  </View>
                  <TextInput
                    style={[styles.input, { paddingLeft: 48 }]}
                    placeholder="••••••••"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    textAlign="right"
                  />
                  <Pressable 
                    style={styles.inputIconLeft}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} color="#6B7280" /> : <Eye size={20} color="#6B7280" />}
                  </Pressable>
                </View>
              </View>

              <Pressable style={styles.forgotPassword} onPress={handleForgotPassword}>
                <Text style={styles.forgotText}>نسيت كلمة المرور؟</Text>
              </Pressable>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {/* Login Button */}
              <Pressable 
                style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.loginBtnText}>دخول</Text>
                    <LogIn size={20} color="#ffffff" />
                  </>
                )}
              </Pressable>
            </View>

            {/* Register a new store */}
            <Pressable style={styles.registerLink} onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerText}>
                ليس لديك متجر؟ <Text style={styles.registerTextBold}>سجّل متجرك الجديد</Text>
              </Text>
            </Pressable>

            {/* Secondary Actions */}
            <View style={styles.secondaryActions}>
              <Text style={styles.supportLabel}>تواجه مشكلة في الدخول؟</Text>
              <Pressable style={styles.supportBtn} onPress={handleSupport}>
                <Headset size={20} color={colors.primary} />
                <Text style={styles.supportBtnText}>تواصل مع الدعم</Text>
              </Pressable>
            </View>

          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2024 شو عبالك - لوحة تحكم التجار</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCF3DC', // background-cream
  },
  
  // Header
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    height: 64, // nav-height
    zIndex: 50,
  },
  logo: {
    width: 40,
    height: 40,
  },
  headerText: {
    fontSize: 20, // headline-sm
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },

  // Main Card
  main: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[8],
  },
  loginCard: {
    width: '100%',
    maxWidth: 448, // max-w-md
    backgroundColor: '#FFFFFF', // surface-white
    borderRadius: radius.xl,
    padding: spacing[8],
    borderWidth: 1,
    borderColor: 'rgba(229, 224, 213, 1)', // border-beige
    ...Platform.select({
      ios: {
        shadowColor: '#974800', // primary shadow tint
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 25,
      },
      android: { elevation: 6 },
    }),
  },

  // Card Header
  cardHeader: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffdbc7', // primary-fixed
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  title: {
    fontSize: 24, // headline-md
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 15, // body-base
    fontFamily: fontFamily.regular,
    color: '#6B7280', // muted-gray
    marginTop: spacing[2],
  },

  // Form
  form: {
    gap: spacing[6],
  },
  inputGroup: {
    gap: spacing[1],
  },
  label: {
    fontSize: 13, // label-md
    fontFamily: fontFamily.medium,
    color: '#564337', // on-surface-variant
    marginRight: spacing[1],
    textAlign: 'right',
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    width: '100%',
    height: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(229, 224, 213, 1)', // border-beige
    borderRadius: radius.lg,
    paddingRight: 40,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputIconRight: {
    position: 'absolute',
    right: spacing[3],
    zIndex: 10,
  },
  inputIconLeft: {
    position: 'absolute',
    left: spacing[3],
    zIndex: 10,
    padding: spacing[1],
  },
  // Phone field: a single RTL row — [Phone icon] [970+ prefix] [number, LTR]
  phoneField: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    height: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(229, 224, 213, 1)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3],
    gap: spacing[2],
  },
  phonePrefix: {
    justifyContent: 'center',
    paddingLeft: spacing[2],
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(229, 224, 213, 1)',
  },
  prefixText: {
    fontFamily: fontFamily.bold,
    color: colors.primary,
    fontSize: 14,
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.textPrimary,
    writingDirection: 'ltr',
  },

  forgotPassword: {
    alignItems: 'flex-start',
  },
  forgotText: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: colors.primary,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    textAlign: 'center',
    fontFamily: fontFamily.medium,
  },

  loginBtn: {
    height: 52,
    backgroundColor: '#e6781e', // primary-container
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
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: '#ffffff', // on-secondary (white) per design
    fontFamily: fontFamily.bold,
    fontSize: 16,
  },

  registerLink: {
    marginTop: spacing[4],
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: '#564337',
    textAlign: 'center',
  },
  registerTextBold: {
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },

  // Secondary Actions
  secondaryActions: {
    marginTop: spacing[4],
    paddingTop: spacing[6],
    borderTopWidth: 1,
    borderTopColor: 'rgba(229, 224, 213, 1)',
    alignItems: 'center',
  },
  supportLabel: {
    fontSize: 15,
    fontFamily: fontFamily.regular,
    color: '#564337',
    marginBottom: spacing[4],
  },
  supportBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.lg,
  },
  supportBtnText: {
    color: colors.primary,
    fontFamily: fontFamily.bold,
    fontSize: 16,
  },

  // Footer
  footer: {
    paddingVertical: spacing[6],
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11, // label-sm
    fontFamily: fontFamily.medium,
    color: '#6B7280',
  },
});
