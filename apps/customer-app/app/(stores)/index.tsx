import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Search, MapPin, Store, Star, Clock, Bike, ShoppingCart } from 'lucide-react-native';
import { businessesApi, tagsApi, promotedBusinessesApi, addressesApi, BASE_URL } from '@shu/api-client';
import { useSavedAddressesStore } from '../../src/stores/saved-addresses.store';
import { fontFamily, spacing } from '../../src/theme';
import { AddressSelector } from '../../components/AddressSelector';

const mediaUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
};

// Colors from heritage_pulse DESIGN.md
const storeColors = {
  background: '#FCF3DC', // background-cream
  surface: '#ffffff',
  primary: '#974800',
  primaryContainer: '#e6781e',
  secondary: '#296a43',
  textPrimary: '#1b1b22',
  textMuted: '#564337', // on-surface-variant
  border: '#e4e1eb', // surface-variant
  success: '#22C55E',
};

export default function StoreHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const selectedAddressId = useSavedAddressesStore((s) => s.selectedId);
  
  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressesApi.list(),
  });

  const selectedAddress = addresses.find((a: any) => a.id === selectedAddressId) ?? addresses[0] ?? null;
  
  const [search, setSearch] = useState('');
  
  const { data: storeTags = [], isLoading: isLoadingTags } = useQuery({
    queryKey: ['tags', 'STORE'],
    queryFn: () => tagsApi.list('STORE'),
  });

  const { data: businesses = [], isLoading: isLoadingBusinesses } = useQuery({
    queryKey: ['businesses', 'STORE', selectedAddress?.areaId],
    queryFn: () =>
      businessesApi.list({
        type: 'STORE',
        areaId: selectedAddress?.areaId || undefined,
      }),
  });

  const { data: promoted = [] } = useQuery({
    queryKey: ['promoted-businesses', 'STORE', selectedAddress?.areaId],
    queryFn: () => promotedBusinessesApi.list({ type: 'STORE', areaId: selectedAddress?.areaId }),
  });

  // Mock banners since there is no store-specific banner endpoint yet
  const mockBanners = [
    { id: 1, title: 'عروض الخضار الطازجة', sub: 'خصم حتى 30%', color: storeColors.secondary },
    { id: 2, title: 'خصومات اللحوم', sub: 'أفضل الأسعار اليوم', color: storeColors.primaryContainer },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing[4] }]}>
        <View style={styles.headerTop}>
          <View style={{ width: 40 }} /> {/* Spacer */}
          <AddressSelector />
          <Pressable style={styles.profileBtn}>
            <Store size={20} color={storeColors.primary} />
          </Pressable>
        </View>

        <Text style={styles.greeting}>مرحباً، ماذا تريد أن تشتري اليوم؟</Text>

        <View style={styles.searchBar}>
          <Search size={20} color={storeColors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="ابحث عن متجر، منتج، أو صنف..."
            placeholderTextColor={storeColors.textMuted}
            value={search}
            onChangeText={setSearch}
            textAlign="right"
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Promoted Banners */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.bannerScroll}
        >
          {mockBanners.map((banner) => (
            <View key={banner.id} style={[styles.banner, { backgroundColor: banner.color }]}>
              <View style={styles.bannerContent}>
                <Text style={styles.bannerTitle}>{banner.title}</Text>
                <Text style={styles.bannerSub}>{banner.sub}</Text>
                <Pressable style={styles.bannerBtn}>
                  <Text style={[styles.bannerBtnText, { color: banner.color }]}>تسوّق الآن</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Categories */}
        <View style={styles.sectionHeader}>
          <Pressable onPress={() => router.push('/all')}>
            <Text style={styles.sectionLink}>عرض الكل</Text>
          </Pressable>
          <Text style={styles.sectionTitle}>الأقسام</Text>
        </View>

        <View style={styles.categoriesGrid}>
          {storeTags.map((tag: any) => (
            <Pressable key={tag.id} style={styles.categoryGridItem} onPress={() => router.push({ pathname: '/all', params: { tagId: tag.id } })}>
              <View style={styles.categoryGridBox}>
                {tag.imageUrl ? (
                  <Image source={{ uri: mediaUrl(tag.imageUrl)! }} style={styles.categoryGridImage} contentFit="cover" />
                ) : (
                  <Store size={32} color={storeColors.primaryContainer} />
                )}
              </View>
              <Text style={styles.categoryGridText} numberOfLines={2}>{tag.name}</Text>
            </Pressable>
          ))}
        </View>

        {/* Order Again Widget */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>اطلب مرة أخرى</Text>
        </View>
        <View style={styles.orderAgainCard}>
          <View style={styles.orderAgainIconWrap}>
            <Clock size={24} color={storeColors.primaryContainer} />
          </View>
          <View style={styles.orderAgainInfo}>
            <Text style={styles.orderAgainTitle}>آخر طلب من سوبر ماركت السلام</Text>
            <Text style={styles.orderAgainSub}>3 قطع • 45.00 ₪</Text>
          </View>
          <Pressable style={styles.orderAgainBtn}>
            <ShoppingCart size={18} color="#fff" />
          </Pressable>
        </View>

        {/* Popular Stores */}
        <View style={styles.sectionHeader}>
          <Pressable onPress={() => router.push('/all')}>
            <Text style={styles.sectionLink}>عرض الكل</Text>
          </Pressable>
          <Text style={styles.sectionTitle}>المتاجر الأكثر شعبية</Text>
        </View>

        {isLoadingBusinesses ? (
          <ActivityIndicator size="large" color={storeColors.primary} style={{ marginTop: 20 }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storesScroll}>
            {businesses.map((b: any) => (
              <Pressable key={b.id} style={styles.storeCard} onPress={() => router.push(`/business/${b.id}`)}>
                <View style={styles.storeCardImgWrap}>
                  {b.imageUrl ? (
                    <Image source={{ uri: mediaUrl(b.imageUrl)! }} style={styles.storeCardImg} contentFit="cover" />
                  ) : (
                    <View style={[styles.storeCardImg, styles.placeholderImg]}>
                      <Store size={32} color={storeColors.border} />
                    </View>
                  )}
                  <View style={[styles.statusBadge, { backgroundColor: b.isOpen ? storeColors.success : '#EF4444' }]}>
                    <Text style={styles.statusBadgeText}>{b.isOpen ? 'مفتوح' : 'مغلق'}</Text>
                  </View>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>{b.rating ? b.rating.toFixed(1) : '4.8'}</Text>
                    <Star size={12} color="#F59E0B" fill="#F59E0B" style={{ marginLeft: 2 }} />
                  </View>
                </View>
                <View style={styles.storeCardBody}>
                  <Text style={styles.storeCardTitle} numberOfLines={1}>{b.name}</Text>
                  <View style={styles.storeCardMeta}>
                    <Text style={styles.storeCardMetaText}>20-30 دقيقة</Text>
                    <Clock size={12} color={storeColors.textMuted} />
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fbf8ff', // surface color from DESIGN.md
  },
  header: {
    backgroundColor: storeColors.background,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  locationWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  locationText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: storeColors.textPrimary,
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: storeColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    color: storeColors.textPrimary,
    textAlign: 'right',
    marginBottom: spacing[4],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: storeColors.surface,
    borderRadius: 16,
    paddingHorizontal: spacing[4],
    height: 52,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: storeColors.textPrimary,
    marginLeft: spacing[2],
  },
  scrollContent: {
    paddingBottom: spacing[12],
  },
  bannerScroll: {
    marginTop: spacing[4],
  },
  banner: {
    width: Dimensions.get('window').width - spacing[4] * 2,
    height: 160,
    borderRadius: 20,
    marginHorizontal: spacing[4],
    justifyContent: 'center',
    padding: spacing[6],
  },
  bannerContent: {
    alignItems: 'flex-end',
  },
  bannerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 22,
    color: storeColors.surface,
    textAlign: 'right',
  },
  bannerSub: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: storeColors.surface,
    opacity: 0.9,
    marginTop: 4,
    textAlign: 'right',
  },
  bannerBtn: {
    backgroundColor: storeColors.surface,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: 20,
    marginTop: spacing[4],
  },
  bannerBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    marginTop: spacing[6],
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    color: storeColors.textPrimary,
  },
  sectionLink: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: storeColors.primaryContainer,
  },
  categoriesGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[4],
    gap: spacing[3],
    justifyContent: 'flex-start',
  },
  categoryGridItem: {
    width: (Dimensions.get('window').width - spacing[4] * 2 - spacing[3] * 2) / 3,
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  categoryGridBox: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    backgroundColor: storeColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: spacing[2],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  categoryGridImage: {
    width: '100%',
    height: '100%',
  },
  categoryGridText: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: storeColors.textPrimary,
    textAlign: 'center',
  },
  orderAgainCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: storeColors.surface,
    marginHorizontal: spacing[4],
    padding: spacing[4],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: storeColors.border,
    borderStyle: 'dashed',
    gap: spacing[3],
  },
  orderAgainIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: storeColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderAgainInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  orderAgainTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: storeColors.textPrimary,
  },
  orderAgainSub: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: storeColors.textMuted,
    marginTop: 2,
  },
  orderAgainBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: storeColors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storesScroll: {
    paddingHorizontal: spacing[4],
    gap: spacing[4],
  },
  storeCard: {
    width: 240,
    backgroundColor: storeColors.surface,
    borderRadius: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  storeCardImgWrap: {
    width: '100%',
    height: 120,
    position: 'relative',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  storeCardImg: {
    width: '100%',
    height: '100%',
  },
  placeholderImg: {
    backgroundColor: storeColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: '#fff',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: storeColors.textPrimary,
  },
  storeCardBody: {
    padding: spacing[3],
    alignItems: 'flex-end',
  },
  storeCardTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: storeColors.textPrimary,
  },
  storeCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  storeCardMetaText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: storeColors.textMuted,
  },
});
