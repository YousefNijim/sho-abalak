import { useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, fontFamily, radius, spacing } from '../src/theme';
import { Image } from 'expo-image';
import { ArrowLeft } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const SLIDES = [
  { 
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAk6EFQ9tFTf-fSVtxgqPRtMcZMtI0n85_zZeE3MGUrOSboQ4HbNb8zzqe5x5HKTprRX3V6plSTrpmrehgmwjfLMLdhi9yNyc_bZq05olKaLEqM3siOyTkqQrZYj8_Z6Sl_mq5U4kxTNWT1WwXupD0-5AurOUz_yLb2qdY9s31lI8BET-Mu4QC3U23X2C7cTw5xb32X5hzjOZLyyKikqRKlit1zHT8yEhEPydomSjKSJJGPE0onJegyY1vmlPRq5jWTp3HNQ-nQK_x4', 
    title: 'اطلب من أي مكان', 
    text: 'آلاف المطاعم والمحلات في منطقتك بانتظارك',
    accent: 'rgba(230, 120, 30, 0.1)', // primary/10
  },
  { 
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBggXS-aJsoNIBrvNUHHoTqwNPWTbm47QRqTAHvwe_tPd7WDaDc_GRgs4D2iHP4Fs7ITD1x40gxEeanft3spsSG4BQu7TlNtk9qQDIlaPvcqQb2uTvb0dzuQJMnvx1hr_WTy9MJQCdJakjiXfoNbALti-W3I8nJZurlWidFC4o8wXoXL59ED_T1u_JA27hVxLrW0_li1YCyjskSmBwzzPuO4XUa8tx6M5c584zYSf9-h54YhblmIa2FX_AdxpmeCyF382hxjRoRjfrR', 
    title: 'توصيل سريع لبابك', 
    text: 'تتبّع طلبك لحظة بلحظة من المطعم وحتى وصوله إليك.',
    accent: 'rgba(41, 106, 67, 0.1)', // secondary/10
  },
  { 
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDBIDV5Ax3ygimF9dS1qgVckW1gxlqdkmE2-VXzow2ltfdzszfIaCD7q226Ns_POWC0Q_WQJYaHlWFjnmLxRZb9w_MGV4Tvk7spaOmukVan-TDaMSEp0kH-G1WzmQ1aqi6Kowb_wNKMZHeKp8xlze8g4TaHSJ2XvJJ0M2q8BNOxiejQ6oT14trM5Ofzc44IK9BJIlcufx23bd5z7kVQCmyisQSD9ur0dXaeWJMyj5_-0vp1mzmYGCj_DH8_fLv_iKW3uIO6H4Mbb1Wr', 
    title: 'ادفع كيف تريد', 
    text: 'نقدي أو إلكتروني — الخيار إلك وبكل سهولة وأمان.',
    accent: 'rgba(0, 158, 232, 0.1)', // tertiary-container/10
  },
];

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const ref = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  const next = () => {
    if (last) router.replace('/(auth)/login');
    else ref.current?.scrollToIndex({ index: index + 1 });
  };

  const prev = () => {
    if (index > 0) ref.current?.scrollToIndex({ index: index - 1 });
  };

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? insets.top || spacing[4] : spacing[4], paddingBottom: insets.bottom + spacing[6] }]}>
      {/* Top Header / Skip Button */}
      <View style={styles.header}>
        <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.skipBtn}>
          <Text style={styles.skipText}>تخطي</Text>
        </Pressable>
      </View>

      {/* Slider */}
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
              <View style={[styles.imageBg, { backgroundColor: item.accent }]} />
              <Image 
                source={{ uri: item.image }} 
                style={styles.image} 
                contentFit="contain" 
              />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.text}>{item.text}</Text>
            </View>
          </View>
        )}
      />

      {/* Footer Actions */}
      <View style={styles.footer}>
        {/* Progress Dots */}
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        {/* Primary Action */}
        <View style={styles.actionsContainer}>
          <Pressable style={styles.primaryBtn} onPress={next}>
            <Text style={styles.primaryBtnText}>{last ? 'ابدأ الآن' : 'التالي'}</Text>
            {!last && <ArrowLeft size={20} color="#fff" style={{ marginLeft: 8 }} />}
          </Pressable>
          
          <Pressable 
            style={[styles.secondaryBtn, index === 0 && { opacity: 0 }]} 
            onPress={prev}
            disabled={index === 0}
          >
            <Text style={styles.secondaryBtnText}>السابق</Text>
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
    paddingHorizontal: spacing[6],
    alignItems: 'flex-start',
    marginBottom: spacing[4],
  },
  skipBtn: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
  },
  skipText: {
    color: '#564337', // on-surface-variant
    fontFamily: fontFamily.medium,
    fontSize: 15,
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
    width: width * 0.8,
    height: width * 0.8,
    maxWidth: 320,
    maxHeight: 320,
    marginBottom: spacing[8],
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  imageBg: {
    position: 'absolute',
    top: '10%',
    left: '10%',
    right: '10%',
    bottom: '10%',
    borderRadius: 999,
    transform: [{ scale: 0.9 }],
  },
  image: {
    width: '100%',
    height: '100%',
    zIndex: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
      android: { elevation: 8 },
    }),
  },
  textContainer: {
    alignItems: 'center',
    gap: spacing[3],
  },
  title: {
    fontSize: 26, // headline-lg-mobile
    fontFamily: fontFamily.bold,
    color: colors.primary,
    textAlign: 'center',
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
    paddingHorizontal: spacing[6],
    gap: spacing[8],
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
    backgroundColor: 'rgba(229, 224, 213, 1)', // border-beige
  },
  dotActive: {
    width: 32,
    backgroundColor: colors.primary,
  },
  
  actionsContainer: {
    gap: spacing[3],
  },
  primaryBtn: {
    height: 52,
    width: '100%',
    backgroundColor: colors.primary,
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
  secondaryBtn: {
    height: 52,
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: colors.primary,
    fontFamily: fontFamily.bold,
    fontSize: 16,
  },
});
