import { useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@shu/ui-components/native';
import { colors, fontSizes, spacing } from '../src/theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  { emoji: '🏪', title: 'اطلب من أي مكان', text: 'آلاف المطاعم والمحلات في منطقتك' },
  { emoji: '🛵', title: 'توصيل سريع لبابك', text: 'تتبّع طلبك لحظة بلحظة' },
  { emoji: '💳', title: 'ادفع كيف تريد', text: 'نقدي أو إلكتروني — الخيار إلك' },
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

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <Pressable style={styles.skip} onPress={() => router.replace('/(auth)/login')}>
        <Text style={styles.skipText}>تخطي</Text>
      </Pressable>

      <FlatList
        ref={ref}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.text}>{item.text}</Text>
          </View>
        )}
      />

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        <Button title={last ? 'ابدأ' : 'التالي'} onPress={next} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  skip: { alignSelf: 'flex-start', padding: spacing[4] },
  skipText: { color: colors.textMuted, fontSize: fontSizes.base },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[6] },
  emoji: { fontSize: 120, marginBottom: spacing[6] },
  title: { fontSize: fontSizes['2xl'], fontWeight: '700', color: colors.textPrimary, marginBottom: spacing[3] },
  text: { fontSize: fontSizes.lg, color: colors.textMuted, textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: spacing[6] },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { width: 24, backgroundColor: colors.primary },
  footer: { paddingHorizontal: spacing[4] },
});
