import { useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, fontFamily, radius, spacing } from '../src/theme';
import { Image } from 'expo-image';
import { ArrowLeft, CheckCircle2, TrendingUp } from 'lucide-react-native';
import { useAuthStore } from '../src/stores/auth.store';

const { width } = Dimensions.get('window');

const SLIDES = [
  { 
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuALQetEkeVDsNZ2er0lr64KRfUoL1mhnpI8v0IeQecvklJun6WnvzdkjAriik_raR8NaBjRUa64dWOGXxBDbzm9xG2wyw7aX1VxbxNS3EgDR-9WrYfvvxzjkmJq6S6fD4SKgnhFj2wGbKBfLTKMWIRWwHnThQPGl3XHa7LImsVQwBWL0hKlU8H4Rm5aM_XSs2YACi80qXaK2rD-kSx5dBP0VWrO4SMtKcMWQPnW8W4Wjtur2dzkfjFJfJRL4X1ToROUeLThsItgRKZF', 
    title: 'أدر متجرك بكل سهولة', 
    text: 'استقبل الطلبات، حدّث قائمتك، وتابع مبيعاتك من مكان واحد.',
    accent: 'rgba(230, 120, 30, 0.1)', // primary/10
    showBadges: true,
  },
  // Future slides can be added here
];

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const ref = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;
  const setBusinessOnboardingSeen = useAuthStore((s) => s.setBusinessOnboardingSeen);

  const completeOnboarding = () => {
    setBusinessOnboardingSeen();
    router.replace('/(auth)/login');
  };

  const next = () => {
    if (last) completeOnboarding();
    else ref.current?.scrollToIndex({ index: index + 1 });
  };

  const prev = () => {
    if (index > 0) ref.current?.scrollToIndex({ index: index - 1 });
  };

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? insets.top || spacing[4] : spacing[4] }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <Text style={styles.brandTitle}>شو عبالك؟</Text>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>أعمال</Text>
          </View>
        </View>
        <Pressable onPress={completeOnboarding} style={styles.skipBtn}>
          <Text style={styles.skipText}>تخطي</Text>
        </Pressable>
      </View>

      {/* Main Slider */}
      <FlatList
        ref={ref}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={styles.slider}
        contentContainerStyle={{ alignItems: 'center' }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.imageContainer}>
              <View style={[styles.imageWrapper, { borderColor: '#FFFFFF', borderWidth: 4 }]}>
                <Image 
                  source={{ uri: item.image }} 
                  style={styles.image} 
                  contentFit="cover" 
                />
              </View>

              {/* Floating UI Badges */}
              {item.showBadges && (
                <>
                  <View style={styles.floatingBadgeLeft}>
                    <CheckCircle2 size={16} color={colors.success} />
                    <Text style={styles.badgeTextDark}>طلب جديد</Text>
                  </View>
                  <View style={styles.floatingBadgeRight}>
                    <TrendingUp size={16} color="#4e2200" />
                    <Text style={styles.badgeTextLight}>+24% مبيعات</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}
      />

      {/* Bottom Content Card */}
      <View style={[styles.bottomCard, { paddingBottom: insets.bottom + spacing[8] }]}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{SLIDES[index].title}</Text>
          <Text style={styles.text}>{SLIDES[index].text}</Text>
        </View>

        <View style={styles.footer}>
          {/* Progress Dots */}
          <View style={styles.dotsContainer}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>

          {/* Primary Action */}
          <Pressable style={styles.primaryBtn} onPress={next}>
            <Text style={styles.primaryBtnText}>التالي</Text>
            <ArrowLeft size={20} color="#fff" style={{ marginLeft: 8 }} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FCF3DC' // background-cream
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[4],
    height: 64,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  brandTitle: {
    color: colors.primary,
    fontFamily: fontFamily.semibold,
    fontSize: 20, // headline-sm
  },
  brandBadge: {
    backgroundColor: '#aef2bf', // secondary-fixed
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  brandBadgeText: {
    color: '#296a43', // secondary
    fontFamily: fontFamily.medium,
    fontSize: 13, // label-md
  },
  skipBtn: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
  },
  skipText: {
    color: '#564337', // on-surface-variant
    fontFamily: fontFamily.semibold,
    fontSize: 20, // headline-sm
  },
  
  slider: {
    flexGrow: 1,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  imageContainer: {
    width: width * 0.85,
    maxWidth: 380,
    aspectRatio: 1,
    position: 'relative',
    marginBottom: spacing[6],
  },
  imageWrapper: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 15 },
      android: { elevation: 8 },
    }),
  },
  image: {
    width: '100%',
    height: '100%',
  },
  floatingBadgeLeft: {
    position: 'absolute',
    bottom: -16,
    left: -16,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderColor: '#E5E0D5', // border-beige
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  floatingBadgeRight: {
    position: 'absolute',
    top: -16,
    right: -8,
    backgroundColor: colors.primary, // primary-container matching design
    padding: 12,
    borderRadius: radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  badgeTextDark: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: '#1b1b22', // on-surface
  },
  badgeTextLight: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: '#4e2200', // on-primary-container matching design
  },

  bottomCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: spacing[8],
    paddingTop: 40,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.05, shadowRadius: 40 },
      android: { elevation: 20 },
    }),
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 26, // headline-lg-mobile
    fontFamily: fontFamily.bold,
    color: '#1b1b22', // on-surface
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  text: {
    fontSize: 17, // body-lg
    fontFamily: fontFamily.regular,
    color: '#564337', // on-surface-variant
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 24,
  },

  footer: {
    gap: spacing[6],
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[2],
  },
  dot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: '#E5E0D5', // border-beige
  },
  dotActive: {
    width: 32,
    backgroundColor: colors.primary, // primary-container
  },
  primaryBtn: {
    height: 52,
    width: '100%',
    backgroundColor: colors.primary, // primary-container
    borderRadius: radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  primaryBtnText: {
    color: '#ffffff',
    fontFamily: fontFamily.bold,
    fontSize: 16,
  },
});
