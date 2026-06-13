import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Store, Star, Clock, Bike, ImageIcon } from 'lucide-react-native';
import { Image } from 'expo-image';
import { colors, fontFamily, fontSizes, radius, spacing } from '../src/theme';
import { businessesApi, tagsApi, BASE_URL } from '@shu/api-client';
import { useSavedAddressesStore } from '../src/stores/saved-addresses.store';
import { useQuery as useAddrQuery } from '@tanstack/react-query';
import { addressesApi } from '@shu/api-client';
import { useAuthStore } from '../src/stores/auth.store';

const mediaUrl = (path: string | null | undefined): string | null =>
  !path ? null : path.startsWith('http') ? path : `${BASE_URL}${path}`;

export default function StoresListing() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const token = useAuthStore((s) => s.token);
  const selectedAddressId = useSavedAddressesStore((s) => s.selectedId);

  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  const { data: addresses = [] } = useAddrQuery({
    queryKey: ['addresses'],
    queryFn: () => addressesApi.list(),
    enabled: !!token,
  });

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) ?? addresses[0] ?? null;

  const { data: storeTags = [] } = useQuery({
    queryKey: ['tags', 'STORE'],
    queryFn: () => tagsApi.list('STORE'),
  });

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['businesses', 'STORE', selectedTagId, selectedAddress?.areaId],
    queryFn: () =>
      businessesApi.list({
        type: 'STORE',
        tagId: selectedTagId || undefined,
        areaId: selectedAddress?.areaId || undefined,
      }),
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
          <ArrowRight size={22} color={colors.secondary} />
        </Pressable>
        <Text style={styles.headerTitle}>المتاجر والسوبرماركت</Text>
        <View style={styles.iconBtn} />
      </View>

      {/* Tag filter chips */}
      {storeTags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagsScroll}
        >
          <Pressable
            style={[styles.tagChip, !selectedTagId && styles.tagChipActive]}
            onPress={() => setSelectedTagId(null)}
          >
            <Text style={[styles.tagChipText, !selectedTagId && styles.tagChipTextActive]}>الكل</Text>
          </Pressable>
          {(storeTags as any[]).map((t: any) => (
            <Pressable
              key={t.id}
              style={[styles.tagChip, selectedTagId === t.id && styles.tagChipActive]}
              onPress={() => setSelectedTagId(selectedTagId === t.id ? null : t.id)}
            >
              <Text style={[styles.tagChipText, selectedTagId === t.id && styles.tagChipTextActive]}>
                {t.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Business list */}
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.secondary} style={{ marginTop: spacing[12] }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {(stores as any[]).length === 0 ? (
            <View style={styles.emptyWrap}>
              <Store size={56} color={colors.border} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>لا توجد متاجر في منطقتك</Text>
              <Text style={styles.emptyDesc}>سيتم إضافة المزيد من المتاجر قريباً</Text>
            </View>
          ) : (
            (stores as any[]).map((b: any) => (
              <Pressable
                key={b.id}
                style={styles.card}
                onPress={() => router.push(`/business/${b.id}`)}
              >
                <View style={styles.cardImageWrap}>
                  {b.imageUrl ? (
                    <Image source={{ uri: mediaUrl(b.imageUrl)! }} style={styles.cardImage} contentFit="cover" />
                  ) : (
                    <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                      <ImageIcon size={40} color={colors.border} />
                    </View>
                  )}
                  <View style={[styles.statusBadge, { backgroundColor: b.isOpen ? '#22C55E' : '#EF4444' }]}>
                    <Text style={styles.statusBadgeText}>{b.isOpen ? 'مفتوح' : 'مغلق'}</Text>
                  </View>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>{b.rating ? b.rating.toFixed(1) : '4.8'}</Text>
                    <Star size={12} color="#F59E0B" fill="#F59E0B" />
                  </View>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{b.name}</Text>
                  <Text style={styles.cardDesc} numberOfLines={1}>
                    {b.tags && b.tags.length > 0
                      ? b.tags.map((t: any) => t.name).join(' • ')
                      : 'متجر'}
                  </Text>
                  <View style={styles.cardMeta}>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaText}>25-35 دقيقة</Text>
                      <Clock size={13} color="#8A7A5F" style={{ marginLeft: 4 }} />
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={[styles.metaText, { color: colors.secondary, fontFamily: fontFamily.bold }]}>
                        {b.deliveryType === 'SELF' ? 0 : (b.area?.deliveryFee ?? 3)} شيكل
                      </Text>
                      <Bike size={13} color={colors.secondary} style={{ marginLeft: 4 }} />
                    </View>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FCF3DC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    backgroundColor: '#FCF3DC',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSizes.xl, fontFamily: fontFamily.bold, color: colors.secondary },
  tagsScroll: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
    flexDirection: 'row',
  },
  tagChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagChipActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  tagChipText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  tagChipTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
    gap: spacing[4],
    paddingTop: spacing[2],
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E0D5',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 6 },
      android: { elevation: 3 },
      web: { boxShadow: '0 4px 8px rgba(0,0,0,0.08)' },
    }),
  },
  cardImageWrap: { height: 160, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardImagePlaceholder: { backgroundColor: '#F5F5F0', alignItems: 'center', justifyContent: 'center' },
  statusBadge: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusBadgeText: { color: '#FFFFFF', fontFamily: fontFamily.bold, fontSize: 11 },
  ratingBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 2 },
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    }),
  },
  ratingText: { fontFamily: fontFamily.bold, fontSize: 12, color: '#1C1C23', marginRight: 4 },
  cardBody: { padding: spacing[4] },
  cardTitle: { fontFamily: fontFamily.bold, fontSize: 18, color: '#1C1C23', textAlign: 'right', marginBottom: 4 },
  cardDesc: { fontFamily: fontFamily.medium, fontSize: 12, color: '#8A7A5F', textAlign: 'right', marginBottom: spacing[2] },
  cardMeta: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[4] },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontFamily: fontFamily.bold, fontSize: 12, color: '#8A7A5F' },
  emptyWrap: { alignItems: 'center', paddingTop: spacing[16], gap: spacing[4] },
  emptyTitle: { fontFamily: fontFamily.bold, fontSize: fontSizes.xl, color: colors.textPrimary, textAlign: 'center' },
  emptyDesc: { fontFamily: fontFamily.regular, fontSize: fontSizes.base, color: colors.textMuted, textAlign: 'center' },
});
