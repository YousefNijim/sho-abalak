import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, Store, Tag, Star, CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';
import { offersApi, BASE_URL } from '@shu/api-client';

const mediaUrl = (p: string | null | undefined) =>
  !p ? null : p.startsWith('http') ? p : `${BASE_URL}${p}`;

export default function OfferDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: offer, isLoading } = useQuery({
    queryKey: ['offer', id],
    queryFn: () => offersApi.getById(id!),
    enabled: !!id,
  });

  if (isLoading || !offer) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isShared = offer.type === 'SHARED';
  const business = offer.offerBusinesses[0]?.business;
  const heroImg = mediaUrl(offer.imageUrl);
  const rules = offer.rules ? offer.rules.split('\n').filter(Boolean) : [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          {heroImg ? (
            <Image source={{ uri: heroImg }} style={styles.heroImg} contentFit="cover" />
          ) : (
            <View style={[styles.heroImg, styles.heroPlaceholder]}>
              <Tag size={64} color={colors.primary} />
            </View>
          )}
          <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} style={styles.heroGradient} pointerEvents="none" />

          {/* Back button */}
          <Pressable style={[styles.backBtn, { top: insets.top + spacing[2] }]} onPress={() => router.back()}>
            <ArrowRight size={22} color="#fff" />
          </Pressable>

          {/* Hero badge */}
          <View style={styles.heroBadge}>
            <Tag size={14} color="#fff" />
            <Text style={styles.heroBadgeText}>{isShared ? 'عرض مشترك' : 'عرض حصري'}</Text>
          </View>
        </View>

        {/* Title card */}
        <View style={styles.titleCard}>
          <Text style={styles.offerTitle}>{offer.title}</Text>
          {offer.description ? <Text style={styles.offerDesc}>{offer.description}</Text> : null}
        </View>

        {/* Offer products discounts */}
        {offer.offerProducts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>المنتجات والخصومات</Text>
            {offer.offerProducts.map((op) => (
              <View key={op.id} style={styles.productRow}>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>-{Number(op.discountPct)}%</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  {op.product ? (
                    <Text style={styles.productName}>{op.product.name}</Text>
                  ) : op.categoryName ? (
                    <Text style={styles.productName}>فئة: {op.categoryName}</Text>
                  ) : (
                    <Text style={styles.productName}>جميع المنتجات</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Rules */}
        {rules.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الشروط والأحكام</Text>
            <View style={styles.rulesCard}>
              {rules.map((r, i) => (
                <View key={i} style={styles.ruleRow}>
                  <CheckCircle size={16} color={colors.secondary} />
                  <Text style={styles.ruleText}>{r}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Participating restaurants (SHARED) */}
        {isShared && offer.offerBusinesses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>المنشآت المشاركة</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.restaurantsScroll}>
              {offer.offerBusinesses.map((ob) => (
                <Pressable
                  key={ob.id}
                  style={styles.restaurantCard}
                  onPress={() => router.push({ pathname: '/business/[id]', params: { id: ob.businessId } })}
                >
                  <View style={styles.restaurantImg}>
                    {ob.business.imageUrl ? (
                      <Image source={{ uri: mediaUrl(ob.business.imageUrl)! }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Store size={28} color={colors.primary} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.restaurantName} numberOfLines={1}>{ob.business.name}</Text>
                  <View style={styles.restaurantRating}>
                    <Star size={12} color="#F59E0B" fill="#F59E0B" />
                    <Text style={styles.restaurantRatingText}>{ob.business.rating ? ob.business.rating.toFixed(1) : '—'}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing[4]) }]}>
        {isShared ? (
          <Text style={styles.footerHint}>اختر منشأة من الأعلى لتطلب منها بهذا العرض</Text>
        ) : business ? (
          <Pressable
            style={styles.ctaBtn}
            onPress={() => router.push({ pathname: '/business/[id]', params: { id: business.id } })}
          >
            <Store size={20} color="#fff" />
            <Text style={styles.ctaBtnText}>زيارة المنشأة وطلب العرض</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  hero: { height: 260, position: 'relative' },
  heroImg: { width: '100%', height: '100%' },
  heroPlaceholder: { backgroundColor: colors.border + '50', alignItems: 'center', justifyContent: 'center' },
  heroGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 100 },
  backBtn: { position: 'absolute', left: spacing[4], width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  heroBadge: { position: 'absolute', bottom: spacing[4], right: spacing[4], flexDirection: 'row', alignItems: 'center', gap: spacing[1], backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: spacing[1] },
  heroBadgeText: { fontFamily: fontFamily.bold, fontSize: fontSizes.xs, color: '#fff' },
  titleCard: { backgroundColor: colors.surface, margin: spacing[4], borderRadius: radius.xl, padding: spacing[4], gap: spacing[2], borderWidth: 1, borderColor: colors.border },
  offerTitle: { fontFamily: fontFamily.extrabold, fontSize: fontSizes.xl, color: colors.textPrimary, textAlign: 'right' },
  offerDesc: { fontFamily: fontFamily.regular, fontSize: fontSizes.base, color: colors.textMuted, textAlign: 'right', lineHeight: 22 },
  section: { paddingHorizontal: spacing[4], marginBottom: spacing[4], gap: spacing[3] },
  sectionTitle: { fontFamily: fontFamily.bold, fontSize: fontSizes.lg, color: colors.textPrimary, textAlign: 'right' },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[3], borderWidth: 1, borderColor: colors.border },
  discountBadge: { backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing[2], paddingVertical: 2, minWidth: 48, alignItems: 'center' },
  discountBadgeText: { fontFamily: fontFamily.extrabold, fontSize: fontSizes.sm, color: '#fff' },
  productName: { fontFamily: fontFamily.semibold, fontSize: fontSizes.base, color: colors.textPrimary },
  rulesCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing[4], gap: spacing[3], borderWidth: 1, borderColor: colors.border },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] },
  ruleText: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSizes.sm, color: colors.textPrimary, textAlign: 'right', lineHeight: 20 },
  restaurantsScroll: { gap: spacing[3], paddingBottom: spacing[2] },
  restaurantCard: { width: 130, backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  restaurantImg: { height: 90, backgroundColor: colors.border + '50' },
  restaurantName: { fontFamily: fontFamily.bold, fontSize: fontSizes.xs, color: colors.textPrimary, textAlign: 'right', padding: spacing[2], paddingBottom: 2 },
  restaurantRating: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: spacing[2], paddingBottom: spacing[2] },
  restaurantRatingText: { fontFamily: fontFamily.medium, fontSize: fontSizes.xs, color: colors.textMuted },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, paddingHorizontal: spacing[4], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.border },
  footerHint: { fontFamily: fontFamily.semibold, fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing[3] },
  ctaBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing[4], flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2] },
  ctaBtnText: { fontFamily: fontFamily.bold, fontSize: fontSizes.base, color: '#fff' },
});
