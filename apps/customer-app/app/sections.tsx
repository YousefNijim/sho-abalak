import { Pressable, ScrollView, StyleSheet, Text, View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { UtensilsCrossed, Store, ChevronLeft, Bell } from 'lucide-react-native';
import { colors, fontFamily, fontSizes, radius, spacing } from '../src/theme';
import { useAuthStore } from '../src/stores/auth.store';

export default function Sections() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <Pressable style={styles.iconBtn}>
          <Bell size={26} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>شو عبالك؟</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing[4], paddingBottom: insets.bottom + spacing[6] }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.greeting}>
          {user?.name ? `مرحباً ${user.name}،` : 'مرحباً،'}
        </Text>
        <Text style={styles.prompt}>شو عبالك اليوم؟</Text>

        {/* Section 1: Food */}
        <Pressable style={styles.cardWrap} onPress={() => router.replace('/(tabs)')}>
          <LinearGradient
            colors={['#E6781E', '#C96016']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.cardIconBg}>
              <UtensilsCrossed size={130} color="#FFFFFF" opacity={0.12} />
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardIconCircle}>
                <UtensilsCrossed size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.cardTitle}>المطاعم والمأكولات</Text>
              <Text style={styles.cardSub}>مطاعم، كافيهات، حلويات ومأكولات</Text>
              <View style={styles.cardCta}>
                <Text style={styles.cardCtaText}>اطلب الآن</Text>
                <ChevronLeft size={18} color="#E6781E" />
              </View>
            </View>
          </LinearGradient>
        </Pressable>

        {/* Section 2: Stores */}
        <Pressable style={styles.cardWrap} onPress={() => router.push('/stores-coming-soon')}>
          <LinearGradient
            colors={['#165A34', '#0E4427']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.cardIconBg}>
              <Store size={130} color="#FFFFFF" opacity={0.12} />
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardIconCircle}>
                <Store size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.cardTitle}>المتاجر والسوبر ماركت</Text>
              <Text style={styles.cardSub}>سوبرماركت، خضار، ملاحم ومتاجر</Text>
              <View style={[styles.cardCta, { backgroundColor: '#fff' }]}>
                <Text style={[styles.cardCtaText, { color: '#165A34' }]}>تسوّق الآن</Text>
                <ChevronLeft size={18} color="#165A34" />
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSizes['2xl'], fontFamily: fontFamily.bold, color: colors.primary },
  greeting: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing[2],
  },
  prompt: {
    fontSize: fontSizes['2xl'],
    fontFamily: fontFamily.extrabold,
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: spacing[5],
  },
  cardWrap: {
    marginBottom: spacing[4],
    borderRadius: radius.lg,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 14 },
      android: { elevation: 6 },
      web: { boxShadow: '0 6px 16px rgba(0,0,0,0.15)' },
    }),
  },
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    minHeight: 180,
    justifyContent: 'flex-end',
  },
  cardIconBg: { position: 'absolute', left: -10, top: -10 },
  cardContent: { padding: spacing[5] },
  cardIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  cardTitle: {
    fontSize: fontSizes['2xl'],
    fontFamily: fontFamily.bold,
    color: '#FFFFFF',
    textAlign: 'right',
  },
  cardSub: {
    fontSize: fontSizes.base,
    fontFamily: fontFamily.regular,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'right',
    marginTop: spacing[1],
    marginBottom: spacing[4],
  },
  cardCta: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: '#fff',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
  },
  cardCtaText: { fontSize: fontSizes.base, fontFamily: fontFamily.bold, color: '#E6781E' },
});
