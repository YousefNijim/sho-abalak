import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Search, SlidersHorizontal, Heart, Clock, Bike, Store, Star } from 'lucide-react-native';
import { Image } from 'expo-image';
import { businessesApi, tagsApi, addressesApi, BASE_URL } from '@shu/api-client';
import { useSavedAddressesStore } from '../../src/stores/saved-addresses.store';
import { fontFamily, spacing } from '../../src/theme';

const mediaUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
};

const storeColors = {
  background: '#FCF3DC', // background-cream
  surface: '#ffffff',
  primary: '#974800',
  primaryContainer: '#e6781e',
  secondary: '#296a43',
  textPrimary: '#1b1b22',
  textMuted: '#564337',
  border: '#e4e1eb',
  success: '#22C55E',
};

export default function AllStores() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const selectedAddressId = useSavedAddressesStore((s) => s.selectedId);
  
  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressesApi.list(),
  });

  const selectedAddress = addresses.find((a: any) => a.id === selectedAddressId) ?? addresses[0] ?? null;

  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  const { data: tags = [] } = useQuery({
    queryKey: ['tags', 'STORE'],
    queryFn: () => tagsApi.list('STORE'),
  });

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['businesses', 'STORE', selectedAddress?.areaId, selectedTagId],
    queryFn: () =>
      businessesApi.list({
        type: 'STORE',
        areaId: selectedAddress?.areaId || undefined,
        tagId: selectedTagId || undefined,
      }),
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[4] }]}>
        <View style={styles.headerIcons}>
          <Pressable style={styles.iconBtn}>
            <SlidersHorizontal size={24} color={storeColors.primary} />
          </Pressable>
          <Pressable style={styles.iconBtn}>
            <Search size={24} color={storeColors.primary} />
          </Pressable>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerTitle}>جميع المتاجر</Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowRight size={24} color={storeColors.primary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>
        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsScroll}
        >
          <Pressable
            style={[styles.pill, selectedTagId === null && styles.pillActive]}
            onPress={() => setSelectedTagId(null)}
          >
            <Text style={[styles.pillText, selectedTagId === null && styles.pillTextActive]}>الكل</Text>
          </Pressable>
          {tags.map((tag: any) => (
            <Pressable
              key={tag.id}
              style={[styles.pill, selectedTagId === tag.id && styles.pillActive]}
              onPress={() => setSelectedTagId(tag.id)}
            >
              <Text style={[styles.pillText, selectedTagId === tag.id && styles.pillTextActive]}>{tag.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Store List */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {isLoading ? (
            <ActivityIndicator size="large" color={storeColors.primary} style={{ marginTop: spacing[12] }} />
          ) : businesses.length === 0 ? (
             <View style={styles.emptyWrap}>
                <Store size={48} color={storeColors.border} />
                <Text style={styles.emptyText}>لا توجد متاجر مطابقة</Text>
             </View>
          ) : (
            businesses.map((b: any) => (
              <Pressable key={b.id} style={styles.storeCard} onPress={() => router.push(`/business/${b.id}`)}>
                <View style={styles.cardInfo}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.storeName} numberOfLines={1}>{b.name}</Text>
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingText}>{b.rating ? b.rating.toFixed(1) : '4.8'}</Text>
                      <Star size={12} color="#F59E0B" fill="#F59E0B" />
                    </View>
                  </View>
                  <Text style={styles.minOrder}>الحد الأدنى للطلب: {b.minOrderValue || 0} شيكل</Text>
                  
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaText}>25-35 دقيقة</Text>
                      <Clock size={14} color={storeColors.textPrimary} />
                    </View>
                    <View style={[styles.metaItem, { marginLeft: spacing[2] }]}>
                      <Text style={[styles.metaText, { color: storeColors.success }]}>توصيل مجاني</Text>
                      <Bike size={14} color={storeColors.success} />
                    </View>
                  </View>
                </View>
                
                <View style={styles.imageWrap}>
                  {b.imageUrl ? (
                    <Image source={{ uri: mediaUrl(b.imageUrl)! }} style={styles.storeImage} contentFit="cover" />
                  ) : (
                    <View style={[styles.storeImage, { alignItems: 'center', justifyContent: 'center', backgroundColor: storeColors.border + '60' }]}>
                      <Store size={40} color={storeColors.textMuted} />
                    </View>
                  )}
                  <Pressable style={styles.favBtn}>
                    <Heart size={20} color={storeColors.textMuted} />
                  </Pressable>
                  {!b.isOpen && (
                    <View style={styles.closedOverlay}>
                      <View style={styles.closedBadge}>
                        <Text style={styles.closedText}>مغلق</Text>
                      </View>
                    </View>
                  )}
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: storeColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  headerIcons: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  iconBtn: {
    padding: spacing[1],
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    color: storeColors.textPrimary,
  },
  backBtn: {
    padding: spacing[1],
  },
  content: {
    flex: 1,
  },
  pillsScroll: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    gap: spacing[2],
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  pill: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2],
    borderRadius: 20,
    backgroundColor: storeColors.surface,
    borderWidth: 1,
    borderColor: storeColors.border,
  },
  pillActive: {
    backgroundColor: storeColors.primary,
    borderColor: storeColors.primary,
  },
  pillText: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: storeColors.textMuted,
  },
  pillTextActive: {
    color: '#FFF',
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[10],
    gap: spacing[4],
  },
  storeCard: {
    flexDirection: 'row',
    backgroundColor: storeColors.surface,
    borderRadius: 20,
    padding: spacing[3],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  imageWrap: {
    width: 100,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginLeft: spacing[3],
  },
  storeImage: {
    width: '100%',
    height: '100%',
  },
  favBtn: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closedBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
    borderRadius: 12,
  },
  closedText: {
    fontFamily: fontFamily.bold,
    color: '#FFF',
    fontSize: 12,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 4,
  },
  storeName: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    color: storeColors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: storeColors.textMuted,
  },
  minOrder: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: storeColors.textMuted,
    marginBottom: spacing[2],
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: storeColors.textPrimary,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: spacing[12],
    gap: spacing[4],
  },
  emptyText: {
    color: storeColors.textMuted,
    fontSize: 16,
    fontFamily: fontFamily.medium,
  },
});
