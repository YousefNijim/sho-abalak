'use client';

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { colors, fontSizes, radius, spacing } from '../../src/theme';
import { businessesApi } from '@shu/api-client';
import { useAuthStore } from '../../src/stores/auth.store';
import { useCartStore } from '../../src/stores/cart.store';

const CATEGORIES = [
  { id: 'RESTAURANT', label: 'مطاعم', emoji: '🍕' },
  { id: 'STORE', label: 'محلات', emoji: '🛒' },
  { id: 'CAFE', label: 'كافيه', emoji: '☕' },
];

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const cartItems = useCartStore((s) => s.items);
  const cartQty = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Fetch businesses with parameters
  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['businesses', selectedCat, search, user?.areaId],
    queryFn: () =>
      businessesApi.list({
        category: selectedCat || undefined,
        search: search || undefined,
        areaId: user?.areaId || undefined,
      }),
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 120, paddingHorizontal: spacing[4] }}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingMuted}>مرحباً {user?.name || '👋'}</Text>
            <Text style={styles.greeting}>شو عبالك اليوم؟</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 18 }}>👤</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.search}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            placeholder="ابحث عن منشأة..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            textAlign="right"
            value={search}
            onChangeText={setSearch}
          />
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
          {selectedCat && (
            <Pressable onPress={() => setSelectedCat(null)}>
              <Text style={styles.link}>إلغاء التحديد</Text>
            </Pressable>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[3] }}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.id}
              style={[styles.catItem, selectedCat === c.id && styles.catItemActive]}
              onPress={() => setSelectedCat(selectedCat === c.id ? null : c.id)}
            >
              <View style={[styles.catCircle, selectedCat === c.id && styles.catCircleActive]}>
                <Text style={{ fontSize: 26 }}>{c.emoji}</Text>
              </View>
              <Text style={[styles.catLabel, selectedCat === c.id && styles.catLabelActive]}>{c.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Nearby businesses */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>المنشآت القريبة</Text>
          <Text style={styles.muted}>📍 {user?.areaId ? 'منطقتك الحالية' : 'كل المناطق'}</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
        ) : businesses.length === 0 ? (
          <Text style={styles.empty}>لا توجد منشآت مطابقة</Text>
        ) : (
          <View style={{ gap: spacing[4] }}>
            {businesses.map((b: any) => {
              const emoji = CATEGORIES.find((c) => c.id === b.category)?.emoji || '🏢';
              const description =
                b.category === 'RESTAURANT'
                  ? 'وجبات سريعة، مأكولات شهية'
                  : b.category === 'CAFE'
                  ? 'مشروبات باردة وساخنة، حلويات'
                  : 'منتجات منوعة لباب بيتك';

              return (
                <Pressable key={b.id} style={styles.card} onPress={() => router.push(`/business/${b.id}`)}>
                  <View style={styles.cardImage}>
                    <Text style={{ fontSize: 56 }}>{emoji}</Text>
                    <View style={[styles.tag, { backgroundColor: b.isOpen ? colors.success : colors.textMuted }]}>
                      <Text style={styles.tagText}>{b.isOpen ? 'مفتوح' : 'مغلق'}</Text>
                    </View>
                  </View>
                  <View style={{ padding: spacing[4] }}>
                    <View style={styles.cardRow}>
                      <Text style={styles.cardTitle}>{b.name}</Text>
                      <Text style={styles.rating}>⭐ {b.rating ? b.rating.toFixed(1) : '5.0'}</Text>
                    </View>
                    <Text style={styles.muted}>{description}</Text>
                    <View style={styles.cardMeta}>
                      <Text style={styles.muted}>🕐 30 دقيقة</Text>
                      <Text style={styles.fee}>🛵 {b.area?.deliveryFee ?? 0} ₪ توصيل</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Cart FAB */}
      {cartQty > 0 ? (
        <Pressable style={[styles.fab, { bottom: 24 }]} onPress={() => router.push('/cart')}>
          <Text style={{ fontSize: 26 }}>🛒</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{cartQty}</Text>
          </View>
        </Pressable>
      ) : null}
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
  searchInput: { flex: 1, fontSize: fontSizes.base, color: colors.textPrimary, textAlign: 'right' },
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
  catItemActive: {},
  catCircle: { width: 64, height: 64, borderRadius: radius.lg, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 1 },
  catCircleActive: { backgroundColor: colors.primary + '20', borderWidth: 2, borderColor: colors.primary },
  catLabel: { fontSize: fontSizes.sm, color: colors.textPrimary },
  catLabelActive: { color: colors.primary, fontWeight: '700' },
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
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing[12] },
});

