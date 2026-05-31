import { useEffect, useRef } from 'react';
import { Text, View, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fontSizes, fontFamily, spacing } from '../src/theme';
import { useAuthStore } from '../src/stores/auth.store';
import { Image } from 'expo-image';
import { Utensils, Truck, Store } from 'lucide-react-native';

export default function Splash() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const businessOnboardingSeen = useAuthStore((s) => s.businessOnboardingSeen);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Initial fade & slide in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ]).start();

    // Subtle pulse for icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ])
    ).start();

    const t = setTimeout(() => {
      if (!businessOnboardingSeen) {
        router.replace('/onboarding');
      } else if (token) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    }, 2500); // 2.5s to show splash
    return () => clearTimeout(t);
  }, [router, token, businessOnboardingSeen]);

  return (
    <View style={styles.container}>
      {/* Pattern Overlay */}
      <View style={styles.patternOverlay} />

      <Animated.View style={[styles.main, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* App Logo */}
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.iconGlow} />
          <Image
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCReVcNoRjS0B6nk0hsqR-CH-Cfefir82XPGQo1KiJivG8p-C3oKdetZWXVsKsqtSXMJSmrWeybvcxuNBOaV3JDvE3xtuSZHsbr7KVLN4Zz0g5wt_chRpnldsZxbYlYGO7XFqTP8dqfBfnpsI1xAOL79h8yakYonhsuSXXDBqDML73MekzbPeVktA1pSTgVpo1O4gMrwKIy8poUbG_Gaa5G4xv6j6kpLUilmqmwYRfLJ485-HuRhFac8xWcCmjS06n-nJhKr5whIZNP' }}
            style={styles.logoImage}
            contentFit="contain"
          />
        </Animated.View>
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <View style={styles.textContainer}>
          <Text style={styles.subtitleText}>تطبيق المنشأة التجارية</Text>
          
          <View style={styles.qualityIndicator}>
            <View style={styles.line} />
            <Text style={styles.premiumText}>PREMIUM HOSPITALITY</Text>
            <View style={styles.line} />
          </View>
        </View>

        <View style={styles.iconsRow}>
          <Utensils size={24} color={colors.primary} />
          <Truck size={24} color={colors.primary} />
          <Store size={24} color={colors.primary} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#FCF3DC' // background-cream
  },
  patternOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.05,
  },
  main: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    width: '100%',
  },
  iconContainer: {
    width: 256,
    height: 256,
    position: 'relative',
  },
  iconGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(230, 120, 30, 0.05)', // primary/5
    borderRadius: 128,
    transform: [{ scale: 1.5 }],
    ...Platform.select({
      ios: { shadowColor: '#e6781e', shadowOpacity: 0.2, shadowRadius: 30 },
    }),
  },
  logoImage: {
    width: '100%',
    height: '100%',
    zIndex: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    width: '100%',
    alignItems: 'center',
    gap: spacing[6],
    zIndex: 10,
  },
  textContainer: {
    alignItems: 'center',
    gap: spacing[2],
  },
  subtitleText: {
    fontSize: 24, // headline-md
    fontFamily: fontFamily.bold,
    color: colors.secondary, // deep green
    letterSpacing: -0.5,
  },
  qualityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  line: {
    width: 32,
    height: 1,
    backgroundColor: '#ddc1b1', // outline-variant
  },
  premiumText: {
    fontSize: 11, // label-sm
    fontFamily: fontFamily.medium,
    color: '#6B7280', // muted-gray
    letterSpacing: 2,
  },
  iconsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    opacity: 0.2,
    marginTop: spacing[4],
  },
});

