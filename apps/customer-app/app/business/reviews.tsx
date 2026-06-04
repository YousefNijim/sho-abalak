import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react-native';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';
import { reviewsApi } from '@shu/api-client';

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} color="#F59E0B" fill={n <= Math.round(value) ? '#F59E0B' : 'transparent'} />
      ))}
    </View>
  );
}

export default function BusinessReviews() {
  const { businessId, businessName } = useLocalSearchParams<{ businessId: string; businessName: string }>();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['reviews-business', businessId],
    queryFn: () => reviewsApi.byBusiness(businessId!),
    enabled: !!businessId,
  });

  const avgBusiness = reviews.length
    ? reviews.reduce((s: number, r: any) => s + r.businessRating, 0) / reviews.length
    : 0;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing[4], gap: spacing[4] }}>
      {/* Summary header */}
      <View style={styles.summary}>
        <Text style={styles.avgNumber}>{avgBusiness > 0 ? avgBusiness.toFixed(1) : '—'}</Text>
        <Stars value={avgBusiness} size={24} />
        <Text style={styles.reviewCount}>
          {reviews.length > 0 ? `${reviews.length} تقييم` : 'لا توجد تقييمات بعد'}
        </Text>
      </View>

      {reviews.length === 0 && (
        <Text style={styles.empty}>كن أول من يقيّم {businessName}</Text>
      )}

      {reviews.map((r: any) => (
        <View key={r.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.date}>
              {new Date(r.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
            </Text>
            <Text style={styles.customerName}>{r.order?.customer?.name || 'زبون'}</Text>
          </View>

          <View style={styles.ratingRow}>
            <Stars value={r.businessRating} />
            <Text style={styles.ratingLabel}>جودة المنتجات</Text>
          </View>

          {r.deliveryRating != null && (
            <View style={styles.ratingRow}>
              <Stars value={r.deliveryRating} />
              <Text style={styles.ratingLabel}>سرعة التوصيل</Text>
            </View>
          )}

          {r.comment ? (
            <Text style={styles.comment}>{r.comment}</Text>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  summary: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing[6], alignItems: 'center', gap: spacing[2], borderWidth: 1, borderColor: colors.border },
  avgNumber: { fontSize: 56, fontFamily: fontFamily.extrabold, color: colors.primary, lineHeight: 64 },
  reviewCount: { fontSize: fontSizes.sm, color: colors.textMuted, fontFamily: fontFamily.medium },
  empty: { textAlign: 'center', color: colors.textMuted, fontSize: fontSizes.base, marginTop: spacing[8] },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, gap: spacing[2] },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  customerName: { fontFamily: fontFamily.bold, fontSize: fontSizes.base, color: colors.textPrimary },
  date: { fontSize: fontSizes.xs, color: colors.textMuted },
  ratingRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing[2], justifyContent: 'flex-end' },
  ratingLabel: { fontSize: fontSizes.sm, color: colors.textMuted, fontFamily: fontFamily.medium },
  comment: { fontSize: fontSizes.sm, color: colors.textPrimary, textAlign: 'right', lineHeight: 22, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing[2], marginTop: spacing[1] },
});
