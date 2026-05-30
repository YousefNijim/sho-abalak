import { useEffect, useRef } from 'react';
import { Text, View, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fontSizes, fontFamily, spacing } from '../src/theme';
import { useAuthStore } from '../src/stores/auth.store';
import { Image } from 'expo-image';

export default function Splash() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      })
    ]).start();

    // Pulse animation for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
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

    // Spin animation for loader
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    const t = setTimeout(() => {
      if (token) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding');
      }
    }, 2500); // Increased slightly to let user enjoy the splash
    return () => clearTimeout(t);
  }, [router, token]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <View style={styles.container}>
      {/* Ambient Pattern */}
      <View style={styles.patternOverlay} />

      <Animated.View style={[styles.main, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
          <Image 
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBM-cWB5QOZf1-bW5_7U7T2D0JkkofYH6g_-dI9itIg_zJVeL0bUbAawnpmJaQFLXRGuImQGoXivYrNqFnZS95W4l3Oez7XDtv-dcd_ATQEt_AEk5A2CZg1M_3_LHLifpS_2vdrL7kVzPKTX9eUAQoWF0k6Ezw_L8kxwhjSvWJ9dE-BPUPj7YO_Yai3R6bMEUGrO_ACOxYog0c_AeY-Dl3EAdr7gbLPI8Vc84Ylyi5ESnNlwD4Spsj9HLXTw_zOySXdE2XUOnNUuBK9' }}
            style={styles.logoImage}
            contentFit="contain"
          />
        </Animated.View>

        <View style={styles.loaderContainer}>
          <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]} />
        </View>
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <Text style={styles.tagline}>منصة طلباتك</Text>
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
    opacity: 0.03,
  },
  main: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    width: '100%',
  },
  logoContainer: {
    marginBottom: spacing[8],
  },
  logoImage: {
    width: 256,
    height: 256,
  },
  loaderContainer: {
    marginTop: spacing[6],
    alignItems: 'center',
  },
  spinner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: 'rgba(230, 120, 30, 0.1)',
    borderTopColor: '#E6781E', // primary-container
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    width: '100%',
    alignItems: 'center',
  },
  tagline: { 
    fontSize: 20, // headline-sm
    fontFamily: fontFamily.medium,
    color: '#6B7280', // muted-gray
    letterSpacing: 0.5,
  },
});
