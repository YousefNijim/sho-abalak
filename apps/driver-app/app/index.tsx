import { useEffect, useRef } from 'react';
import { Text, View, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fontSizes, fontFamily, spacing } from '../src/theme';
import { useAuthStore } from '../src/stores/auth.store';
import { Image } from 'expo-image';
import { Truck } from 'lucide-react-native';

export default function Splash() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const slideUpAnim = useRef(new Animated.Value(20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Bouncing dots animations
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial Slide Up & Fade In
    Animated.parallel([
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    ]).start();

    // Icon Pulse Animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ])
    ).start();

    // Bouncing Dots Animation
    const createBounce = (anim: Animated.Value, delay: number) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: -8,
              duration: 300,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 300,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.delay(400),
          ])
        )
      ]);
    };

    Animated.parallel([
      createBounce(dot1, 0),
      createBounce(dot2, 100),
      createBounce(dot3, 200),
    ]).start();

    const t = setTimeout(() => {
      if (token) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [router, token]);

  return (
    <View style={styles.container}>
      {/* Decorative Background Elements */}
      <View style={styles.patternOverlay} />
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />

      {/* Main Content */}
      <View style={styles.main}>
        {/* App Icon Section */}
        <View style={styles.iconWrapper}>
          <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDorCEh8Gd_NN-_1qvEJDu2mtI3_DmOTLKPe4aQK3-lZ4Udr-sHBmpveuRn-V_q55CW2YVR1ao9OwmsjGUZmgRr6GS1W1BoLbOynB-W7HJBVBDz3ylG18tX9PBrrFc_RLKztx7oqFU2VEBWCGZUgR65NhHqCxmH0a96cZuXrMzUv2WeXXgqch0P1FvvLh3FfCci56WNvutgcQ8gHNldli3Z6jTvib2OBVtJY_uz6H8izOvDlvaDbY6qREPNSepA7qsH-b8du5Zaki2U' }}
              style={styles.iconImage}
              contentFit="cover"
            />
          </Animated.View>
        </View>

        {/* Typography Section */}
        <Animated.View style={[styles.textSection, { opacity: opacityAnim, transform: [{ translateY: slideUpAnim }] }]}>
          <Text style={styles.title}>شو عبالك؟</Text>
          <View style={styles.badge}>
            <Truck size={18} color={colors.primary} />
            <Text style={styles.badgeText}>تطبيق السائق</Text>
          </View>
        </Animated.View>
      </View>

      {/* Footer Section */}
      <Animated.View style={[styles.footer, { opacity: opacityAnim, transform: [{ translateY: slideUpAnim }] }]}>
        <View style={styles.decorativeLine} />
        <Text style={styles.footerText}>انطلق وكن جزءاً من فريق التوصيل</Text>
        
        {/* Loading Micro-interaction */}
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, { transform: [{ translateY: dot1 }] }]} />
          <Animated.View style={[styles.dot, { transform: [{ translateY: dot2 }] }]} />
          <Animated.View style={[styles.dot, { transform: [{ translateY: dot3 }] }]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FCF3DC', // background-cream
    overflow: 'hidden',
  },
  patternOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.05,
  },
  blobTopRight: {
    position: 'absolute',
    top: '-10%',
    right: '-10%',
    width: 256,
    height: 256,
    borderRadius: 128,
    backgroundColor: '#ffdbc7', // primary-fixed
    opacity: 0.2,
    ...Platform.select({ web: { filter: 'blur(3xl)' } }),
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: '-10%',
    left: '-10%',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#abefbd', // secondary-container
    opacity: 0.2,
    ...Platform.select({ web: { filter: 'blur(3xl)' } }),
  },

  main: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    width: '100%',
    paddingHorizontal: spacing[4],
  },
  
  iconWrapper: {
    marginBottom: spacing[8],
  },
  iconContainer: {
    width: 192,
    height: 192,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FFFFFF', // surface-white
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
      android: { elevation: 12 },
    }),
  },
  iconImage: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },

  textSection: {
    alignItems: 'center',
    gap: spacing[4],
  },
  title: {
    fontSize: 38, // hero-lg
    fontFamily: fontFamily.extrabold,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  badge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: 'rgba(230, 120, 30, 0.1)', // primary-container/10
    paddingHorizontal: spacing[4],
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 20, // headline-sm
    fontFamily: fontFamily.bold,
    color: '#4e2200', // on-primary-container
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    alignItems: 'center',
    paddingBottom: 64,
    gap: spacing[8],
    zIndex: 10,
  },
  decorativeLine: {
    height: 1.5,
    width: 48,
    backgroundColor: '#ddc1b1', // outline-variant
    opacity: 0.5,
  },
  footerText: {
    fontSize: 17, // body-lg
    fontFamily: fontFamily.regular,
    color: '#564337', // on-surface-variant
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
});
