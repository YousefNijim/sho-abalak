import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  ShoppingCart,
  MapPin,
  UtensilsCrossed,
  Store,
  Coffee,
  Clock,
  Bike,
  Star,
  SlidersHorizontal,
  ImageIcon,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontSizes, fontFamily, radius, spacing, components } from '../../src/theme';
import { businessesApi } from '@shu/api-client';
import { useAuthStore } from '../../src/stores/auth.store';
import { useCartStore } from '../../src/stores/cart.store';

const CATEGORIES = [
  { id: 'RESTAURANT', label: 'مطاعم', Icon: UtensilsCrossed, color: colors.primary },
  { id: 'STORE', label: 'محلات', Icon: Store, color: colors.secondary },
  { id: 'CAFE', label: 'كافيه', Icon: Coffee, color: '#8B5CF6' },
] as const;

const CATEGORY_DESC: Record<string, string> = {
  RESTAURANT: 'وجبات شهية لباب بيتك',
  CAFE: 'مشروبات وحلويات',
  STORE: 'منتجات متنوعة',
};

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const cartItems = useCartStore((s) => s.items);
  const cartQty = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['businesses', selectedCat, search, user?.areaId],
    queryFn: () =>
      businessesApi.list({
        category: selectedCat || undefined,
        search: search || undefined,
        areaId: user?.areaId || undefined,
      }),
  });

  const bottomInset = insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing[4], paddingBottom: 80 + bottomInset + spacing[6] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Header ─── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingLabel}>
              مرحباً، {user?.name?.split(' ')[0] || 'أهلاً'}
            </Text>
            <Text style={styles.greetingTitle}>شو عبالك اليوم؟</Text>
          </View>
          <View style={styles.avatarWrap}>
            <MapPin size={18} color={colors.primary} />
          </View>
        </View>

        {/* ─── Search bar ─── */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Search size={18} color={colors.textMuted} style={{ marginLeft: spacing[2] }} />
            <TextInput
              placeholder="ابحث عن منشأة أو طبق..."
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              textAlign="right"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <Pressable style={styles.filterBtn}>
            <SlidersHorizontal size={18} color={colors.secondary} />
          </Pressable>
        </View>

        {/* ─── Promo banner ─── */}
        <LinearGradient
          colors={['#E6781E', '#C96016']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          {/* decorative circle */}
          <View style={styles.bannerDecor} pointerEvents="none">
            <UtensilsCrossed size={96} color="rgba(255,255,255,0.12)" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>خصم 20%{'\n'}على طلبك الأول</Text>
            <Text style={styles.bannerSub}>مأكولات شهية بخصومات حصرية</Text>
            <Pressable style={styles.bannerBtn}>
              <Text style={styles.bannerBtnText}>اطلب الآن</Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* ─── Categories ─── */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>الأقسام</Text>
          {selectedCat && (
            <Pressable onPress={() => setSelectedCat(null)}>
              <Text style={styles.link}>إلغاء</Text>
            </Pressable>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catList}
        >
          {CATEGORIES.map(({ id, label, Icon, color }) => {
            const active = selectedCat === id;
            return (
              <Pressable
                key={id}
                style={styles.catItem}
                onPress={() => setSelectedCat(active ? null : id)}
              >
                <View
                  style={[
                    styles.catCircle,
                    { backgroundColor: active ? color : color + '18' },
                    active && styles.catCircleActive,
                  ]}
                >
                  <Icon size={26} color={active ? '#fff' : color} />
                </View>
                <Text style={[styles.catLabel, active && { color, fontFamily: fontFamily.bold }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ─── Nearby businesses ─── */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>المنشآت القريبة</Text>
          <View style={styles.locationRow}>
            <MapPin size={13} color={colors.textMuted} />
            <Text style={styles.muted}>
              {user?.areaId ? 'منطقتك' : 'كل المناطق'}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing[8] }} />
        ) : businesses.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Store size={48} color={colors.border} />
            <Text style={styles.emptyText}>لا توجد منشآت مطابقة</Text>
          </View>
        ) : (
          <View style={{ gap: spacing[4] }}>
            {businesses.map((b: any) => {
              const catMeta = CATEGORIES.find((c) => c.id === b.category);
              const description = CATEGORY_DESC[b.category] || 'منشأة محلية';

              return (
                <Pressable
                  key={b.id}
                  style={styles.card}
                  onPress={() => router.push(`/business/${b.id}`)}
                >
                  {/* Card image area */}
                  <View style={styles.cardImageWrap}>
                    {b.imageUrl ? (
                      <Image
                        source={{ uri: b.imageUrl }}
                        style={styles.cardImage}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : (
                      <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                        <View style={styles.cardImageIcon}>
                          {catMeta ? (
                            <catMeta.Icon size={40} color={catMeta.color} />
                          ) : (
                            <ImageIcon size={40} color={colors.border} />
                          )}
                        </View>
                      </View>
                    )}

                    {/* Dark overlay gradient at top for badge readability */}
                    <LinearGradient
                      colors={['rgba(0,0,0,0.35)', 'transparent']}
                      style={styles.cardOverlay}
                      pointerEvents="none"
                    />

                    {/* Open/closed badge */}
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: b.isOpen ? colors.secondary : '#374151' },
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>
                        {b.isOpen ? 'مفتوح' : 'مغلق'}
                      </Text>
                    </View>
                  </View>

                  {/* Card content */}
                  <View style={styles.cardBody}>
                    {/* Name row + rating */}
                    <View style={styles.cardTopRow}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {b.name}
                      </Text>
                      <View style={styles.ratingPill}>
                        <Star size={11} color="#F59E0B" fill="#F59E0B" />
                        <Text style={styles.ratingText}>
                          {b.rating ? b.rating.toFixed(1) : '5.0'}
                        </Text>
                      </View>
                    </View>

                    {/* Description */}
                    <Text style={styles.cardDesc} numberOfLines={1}>
                      {description}
                    </Text>

                    {/* Meta row */}
                    <View style={styles.cardMeta}>
                      <View style={styles.metaItem}>
                        <Clock size={13} color={colors.textMuted} />
                        <Text style={styles.metaText}>٣٠ دقيقة</Text>
                      </View>
                      <View style={styles.metaDot} />
                      <View style={styles.metaItem}>
                        <Bike size={13} color={colors.primary} />
                        <Text style={[styles.metaText, { color: colors.primary }]}>
                          {b.area?.deliveryFee ?? 0} ₪
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ─── Cart FAB ─── */}
      {cartQty > 0 && (
        <Pressable
          style={[styles.fab, { bottom: 80 + bottomInset + spacing[4] }]}
          onPress={() => router.push('/cart')}
        >
          <ShoppingCart size={22} color="#fff" />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{cartQty}</Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing[4],
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  greetingLabel: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
    marginBottom: 2,
  },
  greetingTitle: {
    fontSize: fontSizes['2xl'],
    fontFamily: fontFamily.extrabold,
    color: colors.textPrimary,
  },
  avatarWrap: {
    width: components.touchTargetMin,
    height: components.touchTargetMin,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: components.inputHeight,
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    fontFamily: fontFamily.regular,
    textAlign: 'right',
  },
  filterBtn: {
    width: components.inputHeight,
    height: components.inputHeight,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  // Banner
  banner: {
    borderRadius: radius.lg,
    padding: spacing[6],
    marginBottom: spacing[6],
    overflow: 'hidden',
    minHeight: 140,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerDecor: {
    position: 'absolute',
    left: -20,
    top: -20,
  },
  bannerTitle: {
    color: '#fff',
    fontSize: fontSizes['2xl'],
    fontFamily: fontFamily.extrabold,
    lineHeight: 34,
    textAlign: 'right',
  },
  bannerSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: fontSizes.sm,
    fontFamily: fontFamily.regular,
    marginTop: spacing[1],
    textAlign: 'right',
  },
  bannerBtn: {
    backgroundColor: '#fff',
    alignSelf: 'flex-end',
    borderRadius: radius.full,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2],
    marginTop: spacing[4],
  },
  bannerBtnText: {
    color: colors.primary,
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.sm,
  },

  // Section header
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },
  link: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontFamily: fontFamily.semibold,
  },

  // Categories
  catList: {
    gap: spacing[4],
    paddingBottom: spacing[1],
    marginBottom: spacing[6],
  },
  catItem: {
    alignItems: 'center',
    gap: spacing[2],
    minWidth: 72,
  },
  catCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catCircleActive: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  catLabel: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
  },

  // Location row
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  muted: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontFamily: fontFamily.regular,
  },

  // Business card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardImageWrap: {
    height: 140,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 140,
  },
  cardImagePlaceholder: {
    backgroundColor: colors.border + '60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImageIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  statusBadge: {
    position: 'absolute',
    top: spacing[3],
    left: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: fontSizes.xs,
    fontFamily: fontFamily.semibold,
  },
  cardBody: {
    padding: spacing[4],
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  cardTitle: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing[3],
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    gap: 3,
  },
  ratingText: {
    fontSize: fontSizes.xs,
    fontFamily: fontFamily.bold,
    color: '#92400E',
  },
  cardDesc: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    textAlign: 'right',
    marginBottom: spacing[3],
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    justifyContent: 'flex-end',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
  },

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    paddingTop: spacing[12],
    gap: spacing[4],
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSizes.base,
    fontFamily: fontFamily.medium,
    textAlign: 'center',
  },

  // FAB
  fab: {
    position: 'absolute',
    left: spacing[4],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: fontFamily.bold,
  },
});
