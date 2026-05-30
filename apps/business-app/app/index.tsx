import { useEffect, useRef } from 'react';
import { Text, View, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fontSizes, fontFamily, spacing } from '../src/theme';
import { useAuthStore } from '../src/stores/auth.store';
import { Image } from 'expo-image';
import { Store } from 'lucide-react-native';

export default function Splash() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loadingAnim = useRef(new Animated.Value(-100)).current;

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

    // Loading bar animation
    Animated.loop(
      Animated.timing(loadingAnim, {
        toValue: 100,
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    ).start();

    const t = setTimeout(() => {
      if (token) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    }, 2500); // 2.5s to show splash
    return () => clearTimeout(t);
  }, [router, token]);

  const loadingTranslate = loadingAnim.interpolate({
    inputRange: [-100, 100],
    outputRange: [200, -200], // Adjust based on width
  });

  return (
    <View style={styles.container}>
      {/* Pattern Overlay */}
      <View style={styles.patternOverlay} />

      <Animated.View style={[styles.main, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* App Icon */}
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.iconGlow} />
          <Image
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDorCEh8Gd_NN-_1qvEJDu2mtI3_DmOTLKPe4aQK3-lZ4Udr-sHBmpveuRn-V_q55CW2YVR1ao9OwmsjGUZmgRr6GS1W1BoLbOynB-W7HJBVBDz3ylG18tX9PBrrFc_RLKztx7oqFU2VEBWCGZUgR65NhHqCxmH0a96cZuXrMzUv2WeXXgqch0P1FvvLh3FfCci56WNvutgcQ8gHNldli3Z6jTvib2OBVtJY_uz6H8izOvDlvaDbY6qREPNSepA7qsH-b8du5Zaki2U' }}
            style={styles.iconImage}
            contentFit="cover"
          />
        </Animated.View>

        {/* Identity Text */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>شو عبالك؟</Text>
          <View style={styles.badge}>
            <Store size={18} color={colors.primary} />
            <Text style={styles.badgeText}>مدير المتجر</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <Text style={styles.footerText}>أدر تجارتك بكل سهولة</Text>
        <View style={styles.decorativeLine} />
        <View style={styles.loadingTrack}>
          <Animated.View style={[styles.loadingBar, { transform: [{ translateX: loadingTranslate }] }]} />
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
    // Note: React Native doesn't support radial gradients natively without libraries like expo-linear-gradient,
    // but opacity over the cream background achieves the general effect.
  },
  main: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    width: '100%',
  },
  iconContainer: {
    width: 160,
    height: 160,
    marginBottom: spacing[8],
    position: 'relative',
  },
  iconGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(230, 120, 30, 0.1)', // primary/10
    borderRadius: 32,
    transform: [{ scale: 1.1 }],
    ...Platform.select({
      ios: { shadowColor: '#e6781e', shadowOpacity: 0.3, shadowRadius: 20 },
      web: { filter: 'blur(20px)' },
    }),
  },
  iconImage: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 15 },
      android: { elevation: 10 },
    }),
  },
  textContainer: {
    alignItems: 'center',
    gap: spacing[2],
  },
  title: {
    fontSize: 30, // headline-lg
    fontFamily: fontFamily.bold,
    color: '#564337', // on-surface-variant
  },
  badge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: 'rgba(151, 72, 0, 0.05)', // primary/5
    paddingHorizontal: spacing[4],
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(151, 72, 0, 0.1)', // primary/10
  },
  badgeText: {
    fontSize: 20, // headline-sm
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    width: '100%',
    alignItems: 'center',
    gap: spacing[3],
    zIndex: 10,
  },
  footerText: {
    fontSize: 15, // body-base
    fontFamily: fontFamily.regular,
    color: 'rgba(86, 67, 55, 0.7)', // on-surface-variant/70
    textAlign: 'center',
  },
  decorativeLine: {
    width: 48,
    height: 4,
    backgroundColor: 'rgba(151, 72, 0, 0.2)', // primary/20
    borderRadius: 2,
    marginBottom: spacing[2],
  },
  loadingTrack: {
    width: 192,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)', // surface-white/50
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingBar: {
    height: '100%',
    width: '33%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});
