import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, radius, spacing } from '../../src/theme';
import { BUSINESSES, CATEGORIES } from '../../src/mock';

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 120, paddingHorizontal: spacing[4] }}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingMuted}>مرحباً 👋</Text>
            <Text style={styles.greeting}>شو عبالك اليوم؟</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 18 }}>👤</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.search}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput placeholder="ابحث عن مطعم أو منتج" placeholderTextColor={colors.textMuted} style={styles.searchInput} textAlign="right" />
        </View>

        {/* Promo banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>خصم 20% على طلبك الأول</Text>
          <Text style={styles.bannerText}>استمتع بأشهى المأكولات المحلية بخصومات حصرية</Text>
          <Pressable style={styles.bannerBtn}>
            <Text style={styles.bannerBtnText}>اطلب الآن</Text>
          </Pressable>
        </View>

        {/* Categories */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>الأقسام</Text>
          <Text style={styles.link}>عرض الكل</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[3] }}>
          {CATEGORIES.map((c) => (
            <View key={c.label} style={styles.catItem}>
              <View style={styles.catCircle}>
                <Text style={{ fontSize: 26 }}>{c.emoji}</Text>
              </View>
              <Text style={styles.catLabel}>{c.label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Nearby businesses */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>المنشآت القريبة</Text>
          <Text style={styles.muted}>📍 نابلس، المركز</Text>
        </View>
        <View style={{ gap: spacing[4] }}>
          {BUSINESSES.map((b) => (
            <Pressable key={b.id} style={styles.card} onPress={() => router.push(`/business/${b.id}`)}>
              <View style={styles.cardImage}>
                <Text style={{ fontSize: 56 }}>{b.emoji}</Text>
                <View style={[styles.tag, { backgroundColor: b.open ? colors.success : colors.textMuted }]}>
                  <Text style={styles.tagText}>{b.open ? 'مفتوح' : 'مغلق'}</Text>
                </View>
              </View>
              <View style={{ padding: spacing[4] }}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardTitle}>{b.name}</Text>
                  <Text style={styles.rating}>⭐ {b.rating}</Text>
                </View>
                <Text style={styles.muted}>{b.desc}</Text>
                <View style={styles.cardMeta}>
                  <Text style={styles.muted}>🕐 {b.time}</Text>
                  <Text style={styles.fee}>🛵 {b.fee}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Cart FAB */}
      <Pressable style={[styles.fab, { bottom: 24 }]} onPress={() => router.push('/cart')}>
        <Text style={{ fontSize: 26 }}>🛒</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>2</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greetingMuted: { color: colors.textMuted, fontSize: fontSizes.sm },
  greeting: { color: colors.primary, fontSize: fontSizes['2xl'], fontWeight: '800' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing[4], height: 52, marginTop: spacing[5], gap: spacing[2] },
  searchIcon: { fontSize: 18 },
  searchInput: { flex: 1, fontSize: fontSizes.base, color: colors.textPrimary },
  banner: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing[6], marginTop: spacing[6] },
  bannerTitle: { color: '#fff', fontSize: fontSizes['2xl'], fontWeight: '700' },
  bannerText: { color: '#fff', opacity: 0.9, marginTop: spacing[1] },
  bannerBtn: { backgroundColor: '#fff', alignSelf: 'flex-start', borderRadius: radius.full, paddingHorizontal: spacing[6], paddingVertical: spacing[2], marginTop: spacing[3] },
  bannerBtnText: { color: colors.primary, fontWeight: '700' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing[6], marginBottom: spacing[3] },
  sectionTitle: { fontSize: fontSizes.xl, fontWeight: '700', color: colors.textPrimary },
  link: { color: colors.primary, fontSize: fontSizes.sm, fontWeight: '600' },
  muted: { color: colors.textMuted, fontSize: fontSizes.sm },
  catItem: { alignItems: 'center', gap: spacing[2] },
  catCircle: { width: 64, height: 64, borderRadius: radius.lg, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 1 },
  catLabel: { fontSize: fontSizes.sm, color: colors.textPrimary },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardImage: { height: 140, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  tag: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.full },
  tagText: { color: '#fff', fontSize: fontSizes.xs, fontWeight: '600' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.textPrimary },
  rating: { fontWeight: '700', color: colors.textPrimary },
  cardMeta: { flexDirection: 'row', gap: spacing[4], marginTop: spacing[3] },
  fee: { color: colors.primary, fontWeight: '700', fontSize: fontSizes.sm },
  fab: { position: 'absolute', left: 16, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  badge: { position: 'absolute', top: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
