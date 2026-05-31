import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, TextInput, Platform, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';
import { useAuthStore } from '../../src/stores/auth.store';
import { Image } from 'expo-image';
import { Phone, Lock, Eye, EyeOff, LogIn } from 'lucide-react-native';

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const login = useAuthStore((s) => s.login);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
      router.replace('/sections');
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
    <View style={styles.container}>
      {/* Decorative Background Elements */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing[10] }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Image 
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDpp8Ke2yW1egfqNG7LWPhwygH71jwaPzZ-M07JKj0jtTIW_EJpIAiq9zycpbtK69shhkwr051R249Z9uhf31YI-uLiR9z_0r1xpLXbpgBn0gbdDI8V7qldKtrlEDHc-tFzSl2lpoioAYz07fJVMp8WtZ4o1pfps2JMvqnDG6euykm7wi7_I5bu3MD2aACv-_77YB-ikTK1XILu0cXxPTRjkH9Q5otOAHn4y07lyIq2n-yRVyF9Qeb2okmUpL4ipRHnSpDfdXMZcmPh' }} 
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={styles.welcomeTitle}>مرحباً بك</Text>
          <Text style={styles.welcomeSubtitle}>سجل دخولك لتجربة أشهى المأكولات الفلسطينية</Text>
        </View>

        {/* Login Form Card */}
        <View style={styles.formCard}>
          
          {/* Phone Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>رقم الهاتف</Text>
            <View style={styles.inputContainer}>
              <View style={styles.inputIconRight}>
                <Phone size={18} color={colors.textMuted} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="59XXXXXXX"
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

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <View style={styles.passwordHeader}>
              <Text style={styles.inputLabel}>كلمة المرور</Text>
              <Link href="/(auth)/register" style={styles.forgotLink}>
                <Text style={styles.forgotText}>نسيت كلمة المرور؟</Text>
              </Link>
            </View>
            <View style={styles.inputContainer}>
              <View style={styles.inputIconRight}>
                <Lock size={18} color={colors.textMuted} />
              </View>
              <TextInput
                style={[styles.input, { paddingLeft: 48 }]}
                placeholder="••••••••"
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

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Submit Button */}
          <Pressable 
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#4e2200" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>دخول</Text>
                <LogIn size={20} color="#4e2200" />
              </>
            )}
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>ما عندك حساب؟ </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text style={styles.footerLink}>سجّل هون</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCF3DC', // background-cream
  },
  blob1: {
    position: 'absolute',
    top: '-10%',
    right: '-10%',
    width: 256,
    height: 256,
    backgroundColor: '#e6781e', // primary-container
    opacity: 0.1,
    borderRadius: 128,
    ...Platform.select({
      ios: { shadowColor: '#e6781e', shadowOpacity: 0.1, shadowRadius: 30 },
      web: { filter: 'blur(3xl)' }
    }),
  },
  blob2: {
    position: 'absolute',
    bottom: '-5%',
    left: '-5%',
    width: 320,
    height: 320,
    backgroundColor: '#abefbd', // secondary-container
    opacity: 0.15,
    borderRadius: 160,
    ...Platform.select({
      ios: { shadowColor: '#abefbd', shadowOpacity: 0.15, shadowRadius: 30 },
      web: { filter: 'blur(3xl)' }
    }),
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
    justifyContent: 'center',
  },
  
  // Header
  header: { 
    alignItems: 'center', 
    marginBottom: spacing[8], 
    textAlign: 'center' 
  },
  logo: { 
    height: 96, 
    width: 96, 
    marginBottom: spacing[4],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  welcomeTitle: {
    fontSize: 26, // headline-lg-mobile
    fontFamily: fontFamily.bold,
    color: colors.primary,
    marginBottom: spacing[1],
  },
  welcomeSubtitle: {
    fontSize: 15,
    fontFamily: fontFamily.regular,
    color: '#564337', // on-surface-variant
    textAlign: 'center',
  },

  // Form Card
  formCard: { 
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
  inputGroup: {
    marginBottom: spacing[5],
  },
  inputLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: '#564337',
    marginBottom: spacing[2],
    paddingHorizontal: 4,
    textAlign: 'right',
  },
  passwordHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
    paddingHorizontal: 4,
  },
  forgotLink: {},
  forgotText: {
    color: colors.primary,
    fontFamily: fontFamily.medium,
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  inputIconRight: {
    position: 'absolute',
    right: 0,
    height: '100%',
    paddingHorizontal: 16,
    justifyContent: 'center',
    zIndex: 1,
  },
  input: {
    flex: 1,
    height: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(229, 224, 213, 1)', // border-beige
    borderRadius: radius.lg,
    paddingRight: 48,
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
  errorText: {
    color: colors.error,
    fontSize: fontSizes.sm,
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    marginTop: -spacing[2],
    marginBottom: spacing[4],
  },
  submitBtn: {
    width: '100%',
    height: 52,
    backgroundColor: 'rgba(230, 120, 30, 1)', // primary-container
    borderRadius: radius.lg,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[4],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 },
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
    flexDirection: 'row-reverse', 
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
  },
});
