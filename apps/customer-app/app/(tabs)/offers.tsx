import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tag } from 'lucide-react-native';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';
import { offersApi, BASE_URL } from '@shu/api-client';
import type { Offer } from '@shu/api-client';

const mediaUrl = (p: string | null | undefined) =>
  !p ? null : p.startsWith('http') ? p : `${BASE_URL}${p}`;

export default function OffersTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ['offers'],
    queryFn: () => offersApi.list(true),
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing[2] }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>العروض والخصومات</Text>
        <Tag size={24} color={colors.primary} />
      </View>

      {offers.length === 0 ? (
        <View style={styles.empty}>
          <Tag size={48} color={colors.border} />
          <Text style={styles.emptyTitle}>لا توجد عروض حالياً</Text>
          <Text style={styles.emptyDesc}>تابعنا للحصول على أحدث العروض والخصومات</Text>
        </View>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(o) => o.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <OfferCard offer={item} onPress={() => router.push({ pathname: '/offer/[id]', params: { id: item.id } })} />}
        />
      )}
    </View>
  );
}

function OfferCard({ offer, onPress }: { offer: Offer; onPress: () => void }) {
  const img = mediaUrl(offer.imageUrl);
  const businessCount = offer.offerBusinesses.length;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardImg}>
        {img ? (
          <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <View style={styles.cardImgPlaceholder}>
            <Tag size={32} color={colors.primary} />
          </View>
        )}
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {offer.type === 'SHARED' ? `${businessCount} منشآت` : offer.offerBusinesses[0]?.business?.name ?? 'عرض'}
          </Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{offer.title}</Text>
        {offer.description ? (
          <Text style={styles.cardDesc} numberOfLines={1}>{offer.description}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing[4], paddingBottom: spacing[3] },
  headerTitle: { fontFamily: fontFamily.extrabold, fontSize: fontSizes['2xl'], color: colors.primary },
  grid: { paddingHorizontal: spacing[3], paddingBottom: spacing[8], gap: spacing[3] },
  row: { gap: spacing[3] },
  card: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  cardImg: { height: 140, backgroundColor: colors.border + '50', position: 'relative' },
  cardImgPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  typeBadge: { position: 'absolute', top: spacing[2], right: spacing[2], backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing[2], paddingVertical: 2 },
  typeBadgeText: { fontFamily: fontFamily.bold, fontSize: fontSizes.xs, color: '#fff' },
  cardBody: { padding: spacing[3], gap: 4 },
  cardTitle: { fontFamily: fontFamily.bold, fontSize: fontSizes.sm, color: colors.textPrimary, textAlign: 'right' },
  cardDesc: { fontFamily: fontFamily.regular, fontSize: fontSizes.xs, color: colors.textMuted, textAlign: 'right' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3], padding: spacing[6] },
  emptyTitle: { fontFamily: fontFamily.bold, fontSize: fontSizes.xl, color: colors.textPrimary },
  emptyDesc: { fontFamily: fontFamily.regular, fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'center' },
});
