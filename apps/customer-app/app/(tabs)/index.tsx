import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Menu, Search, Filter, ShoppingBag, ShoppingCart, MapPin, ChevronDown, Check, Home as HomeIcon, Plus, ArrowRight, X, Clock, Bike, Star, Store, UtensilsCrossed, Settings, SlidersHorizontal, Package, ChevronRight, Share2, Image as ImageIcon, IceCream, Croissant, Utensils, LayoutGrid } from 'lucide-react-native';
import { AddressSelector } from '../../components/AddressSelector';
import { Image } from 'expo-image';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';
import { businessesApi, tagsApi, areasApi, bannersApi, productsApi, BASE_URL } from '@shu/api-client';
import type { SearchProduct } from '@shu/api-client';
import type { Tag, Banner } from '@shu/api-client';

const mediaUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
};
import { useAuthStore } from '../../src/stores/auth.store';
import { useCartStore } from '../../src/stores/cart.store';
import { useActiveOrderStore } from '../../src/stores/active-order.store';
import { useSavedAddressesStore } from '../../src/stores/saved-addresses.store';
import { addressesApi, promotedBusinessesApi } from '@shu/api-client';
import { getCategoryImage } from '../../src/constants/CategoryImages';
import { NotificationBell } from '../../src/components/NotificationBell';
import { PopupAdOverlay } from '../../src/components/PopupAdOverlay';
import { PromotedBusinessCard } from '../../src/components/PromotedBusinessCard';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'بانتظار التأكيد',
  CONFIRMED: 'تم القبول',
  PREPARING: 'جاري التحضير',
  READY: 'جاهز للاستلام',
  PICKED_UP: 'في الطريق',
  DELIVERED: 'تم التسليم',
  CANCELLED: 'ملغي',
};

export default function Home() {
  const SHOW_OLD_DESIGN = false; // تعيين إلى true للرجوع للتصميم القديم

  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const activeOrder = useActiveOrderStore((s) => s.order);

  const selectedAddressId = useSavedAddressesStore((s) => s.selectedId);
  const selectAddress = useSavedAddressesStore((s) => s.select);

  // Wait for both user AND token — token is what Axios actually uses for auth
  const isAuthed = !!user && !!token;

  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressesApi.list(),
    enabled: isAuthed,
  });

  // Sync: if stored selectedId is stale (old local ID), auto-select first API address
  useEffect(() => {
    if (addresses.length === 0) return;
    const match = addresses.find((a) => a.id === selectedAddressId);
    if (!match) selectAddress((addresses[0] as any).id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses.map((a) => a.id).join(','), selectedAddressId]);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) ?? addresses[0] ?? null;

  // Invalidate business listings whenever the selected address changes so fresh data loads
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['businesses'] });
    queryClient.invalidateQueries({ queryKey: ['promoted-businesses'] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddress?.areaId]);

  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // debounced
  const [searchFocused, setSearchFocused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [addressPickerVisible, setAddressPickerVisible] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setSearchQuery(text), 300);
  };

  const clearSearch = () => {
    setSearch('');
    setSearchQuery('');
    setSearchFocused(false);
    searchInputRef.current?.blur();
  };
  
  const bannerScrollRef = useRef<ScrollView>(null);
  const bannerIndexRef = useRef(0);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  // FOOD-section tags drive the category chips (a business can match several tags).
  const { data: foodTags = [] } = useQuery({
    queryKey: ['tags', 'FOOD'],
    queryFn: () => tagsApi.list('FOOD'),
  });

  const { data: activeBanners = [] } = useQuery({
    queryKey: ['banners', 'active'],
    queryFn: () => bannersApi.list(true),
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: () => areasApi.list(),
  });

  const currentArea = areas.find((a: any) => a.id === selectedAddress?.areaId);
  const locationTagText = currentArea ? `${currentArea.city}، ${currentArea.name}` : 'نابلس، المركز';

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['businesses', 'FOOD', selectedTagId, selectedAddress?.areaId],
    queryFn: () =>
      businessesApi.list({
        type: 'FOOD',
        tagId: selectedTagId || undefined,
        areaId: selectedAddress?.areaId || undefined,
      }),
  });

  const { data: storeBusinesses = [] } = useQuery({
    queryKey: ['businesses', 'STORE', selectedAddress?.areaId],
    queryFn: () =>
      businessesApi.list({
        type: 'STORE',
        areaId: selectedAddress?.areaId || undefined,
      }),
  });

  const isSearchActive = searchFocused || searchQuery.trim().length > 0;

  const selectedAreaId = selectedAddress?.areaId ?? undefined;

  // Search — always scoped to selected area
  const { data: searchBusinesses = [], isFetching: searchingBusinesses } = useQuery({
    queryKey: ['search-businesses', searchQuery, selectedAreaId],
    queryFn: () => businessesApi.list({ search: searchQuery, areaId: selectedAreaId }),
    enabled: searchQuery.trim().length >= 2,
  });

  const { data: searchProducts = [], isFetching: searchingProducts } = useQuery({
    queryKey: ['search-products', searchQuery, selectedAreaId],
    queryFn: () => productsApi.search(searchQuery, selectedAreaId),
    enabled: searchQuery.trim().length >= 2,
  });

  const isSearching = searchingBusinesses || searchingProducts;

  // Promoted businesses
  const { data: promotedBusinesses = [] } = useQuery({
    queryKey: ['promoted-businesses', selectedAddress?.areaId],
    queryFn: () => promotedBusinessesApi.list(selectedAddress?.areaId || undefined),
  });

  // Other saved addresses (excluding the currently selected one) — must be before queries that use it
  const otherAreaIds = addresses
    .filter((a) => a.areaId && a.areaId !== selectedAreaId)
    .map((a) => ({ addressId: a.id, areaId: a.areaId!, label: a.label, area: a.area }));

  // Search: also find businesses that match query but deliver to OTHER saved addresses (show disabled in search)
  const { data: searchDisabledBusinesses = [] } = useQuery({
    queryKey: ['search-businesses-other', searchQuery, otherAreaIds.map((a) => a.areaId).join(',')],
    queryFn: async () => {
      if (otherAreaIds.length === 0) return [];
      const results = await Promise.all(
        otherAreaIds.map((addr) =>
          businessesApi.list({ search: searchQuery, type: 'FOOD', areaId: addr.areaId })
            .then((bs: any[]) => bs.map((b: any) => ({ ...b, _deliverableAddress: addr.label })))
        )
      );
      const flat = results.flat();
      const seen = new Set<string>();
      return flat.filter((b: any) => {
        if (seen.has(b.id)) return false;
        if ((searchBusinesses as any[]).some((ab: any) => ab.id === b.id)) return false;
        seen.add(b.id);
        return true;
      });
    },
    enabled: searchQuery.trim().length >= 2 && otherAreaIds.length > 0,
  });

  // Fetch businesses for each other saved address to show disabled cards
  const { data: nearbyOtherBusinesses = [] } = useQuery({
    queryKey: ['businesses-other-areas', otherAreaIds.map((a) => a.areaId).join(',')],
    queryFn: async () => {
      if (otherAreaIds.length === 0) return [];
      // Fetch for all other areas and tag each result with which address delivers there
      const results = await Promise.all(
        otherAreaIds.map((addr) =>
          businessesApi.list({ type: 'FOOD', areaId: addr.areaId })
            .then((bs: any[]) => bs.map((b: any) => ({
              ...b,
              _deliverableAddress: addr.label,
              _deliverableArea: addr.area,
            })))
        )
      );
      // Flatten, dedupe by businessId, exclude ones already in main list
      const flat = results.flat();
      const seen = new Set<string>();
      return flat.filter((b: any) => {
        if (seen.has(b.id)) return false;
        seen.add(b.id);
        return true;
      });
    },
    enabled: otherAreaIds.length > 0,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['businesses'] });
    setRefreshing(false);
  };

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBannerIndex((prev) => {
        const next = (prev + 1) % activeBanners.length;
        bannerScrollRef.current?.scrollTo({
          x: next * (Dimensions.get('window').width - spacing[4] * 2),
          animated: true,
        });
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [activeBanners]);

  const bottomInset = insets.bottom;

  // Helper for premium category icons based on DB Tag name
  const getCategoryIcon = (tagName: string, isActive: boolean, size = 30) => {
    const name = tagName.trim();
    const color = isActive ? '#FFFFFF' : colors.primary;
    
    if (name === 'حلويات') {
      return <IceCream size={size} color={color} />;
    }
    if (name === 'كافيه' || name === 'مخبز' || name === 'قهوة' || name === 'إفطار') {
      return <Croissant size={size} color={color} />;
    }
    if (name === 'سوبرماركت' || name === 'بقالة' || name === 'خضار وفواكه' || name === 'ملحمة' || name === 'ماركت صغير') {
      return <ShoppingBag size={size} color={color} />;
    }
    return <Utensils size={size} color={color} />;
  };

  // --- 1) OLD DESIGN CODE (DISABLED BUT FULLY PRESERVED) ---
  if (SHOW_OLD_DESIGN) {
    return (
      <View style={styles.container}>
        {/* TopAppBar */}
        <View style={[styles.header, { paddingTop: insets.top + spacing[3] }]}>
          <View style={styles.headerRight}>
            <Pressable style={styles.iconBtn} onPress={() => router.replace('/sections')}>
              <LayoutGrid size={26} color={colors.primary} />
            </Pressable>
            <NotificationBell size={28} />

            <Pressable style={styles.avatarWrap} onPress={() => router.push('/(tabs)/profile')}>
              <Image
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBiqR61W2ihUH0rTwN34VvJJq9ZSJBrj2Ozc882b_wtsjH9HPbZnvIKgKI_qQ8eGIebHVNrJLwn0Z5MffcYjDhc-ZWFsSVsdcjZprmW3vF8eSbyqjmYVbhfx-iNnUTeBwsV2bOumOaQi72fW9x6vJGe26PZCM51zkDtAJakjt4PG9RNmWUO48FBtPDGXPzuGEBGt_6w-Dz7K7iKDFENHmiAscsOo1aK19VMVQr8rBWJdcQU_PxxSp-SyYjpsAtmpcM-4qpO4Mt5byvA' }}
                style={styles.avatarImg}
                contentFit="cover"
              />
            </Pressable>
          </View>
          <Text style={styles.headerTitle}>شو عبالك؟</Text>
        </View>

        {/* Address bar */}
        <View style={styles.addressBarSection}>
          <AddressSelector />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: 100 + bottomInset }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          }
        >
          {/* Fix 1: Active order banner */}
          {activeOrder && (
            <Pressable style={styles.activeOrderBanner} onPress={() => router.push({ pathname: '/tracking', params: { id: activeOrder.id } })}>
              <Package size={20} color="#fff" />
              <View style={{ flex: 1, marginHorizontal: spacing[3] }}>
                <Text style={styles.activeOrderTitle}>{activeOrder.businessName}</Text>
                <Text style={styles.activeOrderStatus}>{STATUS_LABELS[activeOrder.status] ?? activeOrder.status}</Text>
              </View>
              <ChevronRight size={20} color="#fff" />
            </Pressable>
          )}

          {/* Search Bar */}
          <View style={styles.searchWrap}>
            <View style={styles.searchBar}>
              <Search size={24} color={colors.textMuted} style={styles.searchIconRight} />
              <TextInput
                placeholder="شو عبالك اليوم؟"
                placeholderTextColor="rgba(107, 114, 128, 0.7)"
                style={styles.searchInput}
                textAlign="right"
                value={search}
                onChangeText={setSearch}
              />
              <Pressable style={styles.filterBtn}>
                <SlidersHorizontal size={20} color={colors.primary} />
              </Pressable>
            </View>
          </View>

          {/* Promo Banners Slider */}
          {activeBanners.length > 0 && (
            <View style={styles.bannerSection}>
              <ScrollView
                ref={bannerScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={{ width: '100%', height: 160 }}
                onMomentumScrollEnd={(e) => {
                  const contentOffset = e.nativeEvent.contentOffset.x;
                  const viewSize = e.nativeEvent.layoutMeasurement.width;
                  bannerIndexRef.current = Math.floor(contentOffset / viewSize);
                }}
              >
                {activeBanners.map((banner: Banner) => (
                  <Pressable
                    key={banner.id}
                    style={{ width: Dimensions.get('window').width - spacing[4] * 2, height: 160, marginEnd: spacing[4] }}
                    onPress={() => {}}
                  >
                    <Image
                      source={{ uri: mediaUrl(banner.imageUrl) ?? '' }}
                      style={{ width: '100%', height: '100%', borderRadius: radius.xl }}
                      contentFit="contain"
                    />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Tag chips (FOOD section) */}
          <View style={styles.sectionHeader}>
            <Pressable onPress={() => setSelectedTagId(null)}>
              <Text style={styles.sectionLink}>عرض الكل</Text>
            </Pressable>
            <Text style={styles.sectionTitle}>الأقسام</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {foodTags.map((tag: Tag) => {
              const isActive = selectedTagId === tag.id;
              return (
                <Pressable
                  key={tag.id}
                  style={[styles.categoryItem]}
                  onPress={() => setSelectedTagId(isActive ? null : tag.id)}
                >
                  <View style={[styles.categoryBox, isActive && styles.categoryBoxActive]}>
                    {(tag as any).imageUrl ? (
                      <Image source={{ uri: mediaUrl((tag as any).imageUrl) ?? '' }} style={styles.categoryImage} contentFit="contain" />
                    ) : (
                      <UtensilsCrossed size={32} color={isActive ? colors.white : colors.primary} />
                    )}
                  </View>
                  <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>{tag.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Near Establishments */}
          <View style={styles.sectionHeader}>
            <View style={styles.locationTag}>
              <MapPin size={16} color={colors.textMuted} />
              <Text style={styles.locationTagText}>{locationTagText}</Text>
            </View>
            <Text style={styles.sectionTitle}>المنشآت القريبة</Text>
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing[8] }} />
          ) : businesses.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Store size={48} color={colors.border} />
              <Text style={styles.emptyText}>لا توجد منشآت مطابقة</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {businesses.map((b: any) => (
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
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>{b.isOpen ? 'مفتوح' : 'مغلق'}</Text>
                    </View>
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{b.name}</Text>
                      <View style={styles.ratingWrap}>
                        <Star size={14} color={colors.warning} fill={colors.warning} />
                        <Text style={styles.ratingText}>{b.rating ? b.rating.toFixed(1) : '4.8'}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardDesc} numberOfLines={1}>
                      {b.tags && b.tags.length > 0
                        ? b.tags.map((t: Tag) => t.name).join('، ')
                        : 'مأكولات ومشروبات'}
                    </Text>
                    <View style={styles.cardMeta}>
                      <View style={styles.metaItem}>
                        <Clock size={16} color={colors.textMuted} />
                        <Text style={styles.metaText}>25-35 دقيقة</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Bike size={16} color={colors.primary} />
                        <Text style={[styles.metaText, { color: colors.primary, fontFamily: fontFamily.bold }]}>
                          {b.area?.deliveryFee ?? 3} شيكل
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // --- 2) NEW PREMIUM DESIGN (ACTIVE BY DEFAULT) ---
  return (
    <View style={styles.container}>
      <PopupAdOverlay page="home" />
      {/* New TopAppBar */}
      <View style={[styles.newHeader, { paddingTop: insets.top + spacing[2] }]}>
        {/* Right (renders first on right side in forced RTL): Notification Bell */}
        <View style={styles.headerCircularBtn}>
          <NotificationBell size={24} />
        </View>

        {/* Center: Address selector */}
        <AddressSelector />

        {/* Left (renders on far left in forced RTL): Hamburger Menu Button */}
        <Pressable style={styles.headerCircularBtn} onPress={() => router.replace('/sections')}>
          <Menu size={24} color={colors.primary} />
        </Pressable>
      </View>

      {/* Full-page search overlay */}
      {isSearchActive && (
        <View style={[styles.searchOverlay, { paddingTop: insets.top }]}>
          {/* Search header */}
          <View style={styles.searchOverlayHeader}>
            <Pressable style={styles.searchOverlayBack} onPress={clearSearch}>
              <ArrowRight size={24} color={colors.primary} />
            </Pressable>
            <View style={[styles.newSearchBar, styles.searchOverlayInput]}>
              <Search size={20} color={colors.primary} style={styles.newSearchIconRight} />
              <TextInput
                ref={searchInputRef}
                placeholder="ابحث عن مطعم أو منتج..."
                placeholderTextColor="rgba(107, 114, 128, 0.7)"
                style={styles.newSearchInput}
                textAlign="right"
                value={search}
                onChangeText={handleSearchChange}
                autoFocus
                returnKeyType="search"
              />
              {search.length > 0 && (
                <Pressable style={styles.newSearchClearBtn} onPress={clearSearch}>
                  <X size={18} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: 100 + bottomInset, paddingTop: spacing[2] }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {searchQuery.trim().length === 0 ? (
              <View style={styles.searchHint}>
                <Search size={48} color={colors.border} />
                <Text style={styles.searchHintText}>ابحث عن مطعم، منتج، أو طبق...</Text>
              </View>
            ) : isSearching ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing[12] }} />
            ) : (
              <>
                {/* Business results */}
                {(searchBusinesses as any[]).length > 0 && (
                  <>
                    <Text style={styles.searchSectionTitle}>المطاعم والمنشآت</Text>
                    {(searchBusinesses as any[]).map((b: any) => (
                      <Pressable
                        key={b.id}
                        style={styles.searchBusinessCard}
                        onPress={() => { clearSearch(); router.push(`/business/${b.id}`); }}
                      >
                        <View style={styles.searchBusinessImg}>
                          {b.imageUrl ? (
                            <Image source={{ uri: mediaUrl(b.imageUrl)! }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                          ) : (
                            <Store size={28} color={colors.border} />
                          )}
                        </View>
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                          <Text style={styles.searchBusinessName} numberOfLines={1}>{b.name}</Text>
                          <Text style={styles.searchBusinessMeta} numberOfLines={1}>
                            {b.tags?.map((t: any) => t.name).join(' • ') || 'مطعم'} • {b.area?.city}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <Star size={12} color="#F59E0B" fill="#F59E0B" />
                            <Text style={styles.searchBusinessMeta}>{b.rating ? b.rating.toFixed(1) : '—'}</Text>
                            <Text style={[styles.searchBusinessMeta, { color: b.isOpen ? colors.secondary : colors.error }]}>
                              • {b.isOpen ? 'مفتوح' : 'مغلق'}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    ))}
                  </>
                )}

                {/* Product results */}
                {(searchProducts as SearchProduct[]).length > 0 && (
                  <>
                    <Text style={[styles.searchSectionTitle, { marginTop: spacing[5] }]}>المنتجات</Text>
                    {(searchProducts as SearchProduct[]).map((p) => (
                      <Pressable
                        key={p.id}
                        style={styles.searchProductCard}
                        onPress={() => { clearSearch(); router.push(`/business/${p.business?.id ?? p.businessId}`); }}
                      >
                        <View style={styles.searchProductImg}>
                          {p.imageUrl ? (
                            <Image source={{ uri: mediaUrl(p.imageUrl)! }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                          ) : (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                              <UtensilsCrossed size={22} color={colors.border} />
                            </View>
                          )}
                        </View>
                        <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
                          <Text style={styles.searchProductName} numberOfLines={1}>{p.name}</Text>
                          {p.description ? (
                            <Text style={styles.searchProductDesc} numberOfLines={1}>{p.description}</Text>
                          ) : null}
                          <Text style={styles.searchProductBusiness} numberOfLines={1}>
                            {p.business?.name ?? ''}
                            {p.business?.area?.city ? ` • ${p.business.area.city}` : ''}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                            <Text style={styles.searchProductPrice}>{Number(p.price)} ₪</Text>
                            {p.business && (
                              <Text style={[styles.searchBusinessMeta, { color: p.business.isOpen ? colors.secondary : colors.error }]}>
                                {p.business.isOpen ? 'مفتوح' : 'مغلق'}
                              </Text>
                            )}
                          </View>
                        </View>
                      </Pressable>
                    ))}
                  </>
                )}

                {/* Disabled businesses in search — match query but deliver to other saved addresses */}
                {(searchDisabledBusinesses as any[]).length > 0 && (
                  <>
                    <Text style={[styles.searchSectionTitle, { marginTop: spacing[5], color: colors.textMuted }]}>
                      غير متاح لعنوانك الحالي
                    </Text>
                    {(searchDisabledBusinesses as any[]).map((b: any) => (
                      <View key={`ds-${b.id}`} style={[styles.searchBusinessCard, { opacity: 0.7 }]}>
                        <View style={[styles.searchBusinessImg, { opacity: 0.5 }]}>
                          {b.imageUrl ? (
                            <Image source={{ uri: mediaUrl(b.imageUrl)! }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                          ) : (
                            <Store size={28} color={colors.border} />
                          )}
                        </View>
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                          <Text style={styles.searchBusinessName} numberOfLines={1}>{b.name}</Text>
                          <Text style={[styles.searchBusinessMeta, { color: colors.secondary, fontFamily: fontFamily.semibold }]} numberOfLines={1}>
                            يوصّل إلى: {b._deliverableAddress}
                          </Text>
                          <Text style={styles.searchBusinessMeta}>غيّر عنوانك للطلب من هنا</Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}

                {(searchBusinesses as any[]).length === 0 && (searchProducts as SearchProduct[]).length === 0 && (searchDisabledBusinesses as any[]).length === 0 && (
                  <View style={styles.searchHint}>
                    <Search size={48} color={colors.border} />
                    <Text style={styles.searchHintText}>لا توجد نتائج لـ "{searchQuery}"</Text>
                    <Text style={styles.searchHintSub}>جرّب كلمة مختلفة أو تصفح الأقسام</Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.newScroll, { paddingBottom: 100 + bottomInset }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {/* Active order tracking banner (reconnected) */}
        {activeOrder && (
          <Pressable style={styles.activeOrderBanner} onPress={() => router.push({ pathname: '/tracking', params: { id: activeOrder.id } })}>
            <Package size={20} color="#fff" />
            <View style={{ flex: 1, marginHorizontal: spacing[3] }}>
              <Text style={styles.activeOrderTitle}>{activeOrder.businessName}</Text>
              <Text style={styles.activeOrderStatus}>{STATUS_LABELS[activeOrder.status] ?? activeOrder.status}</Text>
            </View>
            <ChevronRight size={20} color="#fff" />
          </Pressable>
        )}

        {/* Smart Search Bar */}
        <View style={styles.newSearchWrap}>
          <View style={[styles.newSearchBar, searchFocused && styles.newSearchBarFocused]}>
            <Search size={22} color={searchFocused ? colors.primary : colors.textMuted} style={styles.newSearchIconRight} />
            <TextInput
              ref={searchInputRef}
              placeholder="ابحث عن مطعم أو منتج..."
              placeholderTextColor="rgba(107, 114, 128, 0.7)"
              style={styles.newSearchInput}
              textAlign="right"
              value={search}
              onChangeText={handleSearchChange}
              onFocus={() => setSearchFocused(true)}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable style={styles.newSearchClearBtn} onPress={clearSearch}>
                <X size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        </View>

        {/* New Promo Banners Carousel */}
        {activeBanners.length > 0 && (
          <View style={styles.newBannerSection}>
            <ScrollView
              ref={bannerScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={{ width: '100%', height: 160 }}
              onMomentumScrollEnd={(e) => {
                const contentOffset = e.nativeEvent.contentOffset.x;
                const viewSize = e.nativeEvent.layoutMeasurement.width;
                const index = Math.round(contentOffset / viewSize);
                setActiveBannerIndex(index);
              }}
            >
              {activeBanners.map((banner: Banner) => (
                <Pressable
                  key={banner.id}
                  style={{ width: Dimensions.get('window').width - spacing[4] * 2, height: 160 }}
                  onPress={() => {}}
                >
                  <Image
                    source={{ uri: mediaUrl(banner.imageUrl) || undefined }}
                    style={{ width: '100%', height: '100%', borderRadius: 24 }}
                    contentFit="contain"
                  />
                </Pressable>
              ))}
            </ScrollView>

            {/* Custom Carousel dots */}
            {activeBanners.length > 1 && (
              <View style={styles.carouselDotsContainer}>
                {activeBanners.map((_, idx) => {
                  const isActive = idx === activeBannerIndex;
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.carouselDot,
                        isActive ? styles.carouselDotActive : styles.carouselDotInactive
                      ]}
                    />
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Categories Section */}
        <View style={styles.newSectionHeader}>
          <Pressable onPress={() => setSelectedTagId(null)}>
            <Text style={styles.newSectionLink}>عرض الكل</Text>
          </Pressable>
          <Text style={styles.newSectionTitle}>الأقسام</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.newCategoriesScroll}
        >
          {foodTags.map((tag: Tag) => {
            const isActive = selectedTagId === tag.id;
            return (
              <Pressable
                key={tag.id}
                style={styles.newCategoryItem}
                onPress={() => setSelectedTagId(isActive ? null : tag.id)}
              >
                <View style={[styles.newCategoryBox, isActive && styles.newCategoryBoxActive]}>
                  {(tag as any).imageUrl ? (
                    <Image
                      source={{ uri: mediaUrl((tag as any).imageUrl) || undefined }}
                      style={{ width: '100%', height: '100%', borderRadius: 18 }}
                      contentFit="cover"
                    />
                  ) : (
                    getCategoryIcon(tag.name, isActive, 28)
                  )}
                </View>
                <Text style={[styles.newCategoryText, isActive && styles.newCategoryTextActive]}>
                  {tag.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Near Establishments Title */}
        <View style={styles.newSectionHeader}>
          <View style={styles.newLocationTag}>
            <Text style={styles.newLocationTagText}>{locationTagText}</Text>
          </View>
          <Text style={styles.newSectionTitle}>المطاعم القريبة</Text>
        </View>

        {/* Promoted Businesses */}
        {promotedBusinesses.length > 0 && !isLoading && !selectedTagId && !isSearching && (
           <View style={{ marginBottom: spacing[2], marginTop: spacing[2] }}>
              {promotedBusinesses.map((promo: any) => (
                <PromotedBusinessCard key={promo.id} promoted={promo} />
              ))}
           </View>
        )}

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing[8] }} />
        ) : (
          <View style={styles.newGrid}>
            {/* Active businesses — deliver to selected address */}
            {businesses.map((b: any) => (
              <BusinessCard key={b.id} b={b} onPress={() => router.push(`/business/${b.id}`)} />
            ))}

            {/* Disabled businesses — deliver to other saved addresses */}
            {(nearbyOtherBusinesses as any[])
              .filter((b: any) => !(businesses as any[]).some((ab: any) => ab.id === b.id))
              .map((b: any) => (
                <DisabledBusinessCard key={`disabled-${b.id}`} b={b} />
              ))}

            {businesses.length === 0 && nearbyOtherBusinesses.length === 0 && (
              <View style={styles.emptyWrap}>
                <Store size={48} color={colors.border} />
                <Text style={styles.emptyText}>لا توجد منشآت مطابقة</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Stores & Supermarkets section ── */}
        {(storeBusinesses as any[]).length > 0 && (
          <>
            <View style={styles.newSectionHeader}>
              <Pressable onPress={() => router.push('/stores-coming-soon')}>
                <Text style={styles.newSectionLink}>عرض الكل</Text>
              </Pressable>
              <Text style={styles.newSectionTitle}>المتاجر والسوبرماركت</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.storesHorizontalScroll}
            >
              {(storeBusinesses as any[]).map((b: any) => (
                <Pressable
                  key={b.id}
                  style={styles.storeHCard}
                  onPress={() => router.push(`/business/${b.id}`)}
                >
                  <View style={styles.storeHCardImg}>
                    {b.imageUrl ? (
                      <Image source={{ uri: mediaUrl(b.imageUrl)! }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Store size={32} color={colors.secondary} />
                      </View>
                    )}
                    <View style={[styles.newStatusBadge, { backgroundColor: b.isOpen ? '#22C55E' : '#EF4444' }]}>
                      <Text style={styles.newStatusBadgeText}>{b.isOpen ? 'مفتوح' : 'مغلق'}</Text>
                    </View>
                  </View>
                  <Text style={styles.storeHCardName} numberOfLines={1}>{b.name}</Text>
                  {b.tags && b.tags.length > 0 && (
                    <Text style={styles.storeHCardTag} numberOfLines={1}>
                      {b.tags[0].name}
                    </Text>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function BusinessCard({ b, onPress }: { b: any; onPress: () => void }) {
  const statusBgColor = b.isOpen ? '#22C55E' : '#EF4444';
  return (
    <Pressable style={styles.newCard} onPress={onPress}>
      <View style={styles.newCardImageWrap}>
        {b.imageUrl ? (
          <Image source={{ uri: mediaUrl(b.imageUrl)! }} style={styles.newCardImage} contentFit="cover" />
        ) : (
          <View style={[styles.newCardImage, styles.newCardImagePlaceholder]}>
            <ImageIcon size={40} color={colors.border} />
          </View>
        )}
        <View style={[styles.newStatusBadge, { backgroundColor: statusBgColor }]}>
          <Text style={styles.newStatusBadgeText}>{b.isOpen ? 'مفتوح' : 'مغلق'}</Text>
        </View>
        <View style={styles.newRatingBadge}>
          <Text style={styles.newRatingText}>{b.rating ? b.rating.toFixed(1) : '4.8'}</Text>
          <Star size={12} color="#F59E0B" fill="#F59E0B" style={{ marginLeft: 2 }} />
        </View>
      </View>
      <View style={styles.newCardBody}>
        <View style={styles.newCardRow}>
          <View style={styles.newCardRightCol}>
            <Text style={styles.newCardTitle} numberOfLines={1}>{b.name}</Text>
            <Text style={styles.newCardDesc} numberOfLines={1}>
              {b.tags && b.tags.length > 0 ? b.tags.map((t: Tag) => t.name).join(' • ') : 'مأكولات ومشروبات'}
            </Text>
          </View>
          <View style={styles.newCardLeftCol}>
            <View style={styles.newMetaItem}>
              <Text style={styles.newMetaText}>20-30 دقيقة</Text>
              <Clock size={13} color="#8A7A5F" style={{ marginLeft: 4 }} />
            </View>
            <View style={[styles.newMetaItem, { marginTop: 4 }]}>
              <Text style={[styles.newMetaText, { color: colors.primary, fontFamily: fontFamily.bold }]}>
                {b.area?.deliveryFee ?? 3} شيكل
              </Text>
              <Bike size={13} color={colors.primary} style={{ marginLeft: 4 }} />
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function DisabledBusinessCard({ b }: { b: any }) {
  return (
    <View style={[styles.newCard, styles.disabledCard]}>
      <View style={styles.newCardImageWrap}>
        {b.imageUrl ? (
          <Image source={{ uri: mediaUrl(b.imageUrl)! }} style={[styles.newCardImage, { opacity: 0.45 }]} contentFit="cover" />
        ) : (
          <View style={[styles.newCardImage, styles.newCardImagePlaceholder, { opacity: 0.45 }]}>
            <ImageIcon size={40} color={colors.border} />
          </View>
        )}
        {/* Delivery address badge */}
        <View style={styles.deliverableBadge}>
          <MapPin size={11} color="#fff" />
          <Text style={styles.deliverableBadgeText} numberOfLines={1}>
            يوصّل إلى: {b._deliverableAddress}
          </Text>
        </View>
      </View>
      <View style={[styles.newCardBody, { opacity: 0.55 }]}>
        <View style={styles.newCardRow}>
          <View style={styles.newCardRightCol}>
            <Text style={styles.newCardTitle} numberOfLines={1}>{b.name}</Text>
            <Text style={styles.newCardDesc} numberOfLines={1}>
              {b.tags && b.tags.length > 0 ? b.tags.map((t: Tag) => t.name).join(' • ') : 'مأكولات ومشروبات'}
            </Text>
          </View>
          <View style={styles.newCardLeftCol}>
            <View style={styles.newMetaItem}>
              <Text style={styles.newMetaText}>20-30 دقيقة</Text>
              <Clock size={13} color="#8A7A5F" style={{ marginLeft: 4 }} />
            </View>
          </View>
        </View>
        <Text style={styles.disabledCardHint}>
          غيّر عنوانك إلى "{b._deliverableAddress}" للطلب من هنا
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCF3DC', // background-cream
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    backgroundColor: '#FCF3DC',
    zIndex: 50,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  iconBtn: {
    padding: spacing[1],
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ffdbc7', // primary-fixed
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  headerTitle: {
    fontFamily: fontFamily.bold, // Cairo 700
    fontSize: 26, // headline-lg-mobile
    color: colors.primary,
    letterSpacing: -0.5,
  },
  scroll: {
    paddingTop: spacing[4],
    paddingHorizontal: spacing[4],
  },
  searchWrap: {
    marginTop: spacing[2],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 0,
    borderRadius: radius.xl, // 16px
    height: 56, // h-14
    paddingHorizontal: spacing[4],
    position: 'relative',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 2 },
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    }),
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    paddingRight: 40, // space for search icon
    paddingLeft: 40, // space for filter icon
  },
  searchIconRight: {
    position: 'absolute',
    right: spacing[4],
  },
  filterBtn: {
    position: 'absolute',
    left: spacing[4],
    backgroundColor: 'rgba(230, 120, 30, 0.1)', // primary/10
    padding: 6,
    borderRadius: radius.md,
  },
  bannerSection: {
    marginTop: spacing[6],
  },
  banner: {
    backgroundColor: '#e6781e', // primary-container
    borderRadius: 24, // 3xl
    overflow: 'hidden',
    position: 'relative',
    aspectRatio: 16 / 7,
    justifyContent: 'center',
    padding: spacing[6],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6 },
      android: { elevation: 3 },
      web: { boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
    }),
  },
  bannerContent: {
    zIndex: 10,
    alignItems: 'flex-end',
  },
  bannerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 24, // headline-md
    color: colors.white, // on-primary
    textAlign: 'right',
  },
  bannerSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.base,
    color: colors.white,
    opacity: 0.9,
    marginTop: spacing[1],
    textAlign: 'right',
  },
  bannerBtn: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    marginTop: spacing[3],
  },
  bannerBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.primary,
  },
  bannerIconBg: {
    position: 'absolute',
    left: -40,
    bottom: -40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[6],
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 20, // headline-sm
    color: colors.textPrimary,
  },
  sectionLink: {
    fontFamily: fontFamily.medium,
    fontSize: 13, // label-md
    color: colors.primary,
  },
  categoriesScroll: {
    paddingBottom: spacing[2],
    gap: spacing[4],
    flexDirection: 'row',
  },
  categoryItem: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing[2],
  },
  categoryBox: {
    width: 72,
    height: 72,
    backgroundColor: colors.white,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.06)' },
    }),
  },
  categoryBoxActive: {
    backgroundColor: colors.primary,
  },
  categoryImage: {
    width: 60,
    height: 60,
  },
  categoryText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.xs,
    color: colors.textPrimary,
  },
  categoryTextActive: {
    color: colors.primary,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationTagText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  grid: {
    gap: spacing[4],
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6 },
      android: { elevation: 3 },
      web: { boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
    }),
  },
  cardImageWrap: {
    height: 160,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    backgroundColor: colors.border + '60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    backgroundColor: 'rgba(34, 197, 94, 0.9)', // success-green
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusBadgeText: {
    color: colors.white,
    fontFamily: fontFamily.medium,
    fontSize: 11,
  },
  cardBody: {
    padding: spacing[4],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 20, // headline-sm
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  cardDesc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.base,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[3],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
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

  // Address bar
  addressBarSection: {
    paddingHorizontal: spacing[4],
    marginTop: spacing[2],
    marginBottom: 0,
  },
  addressBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  addressIconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressBarTextCol: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  addressBarLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addressBarLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  addressBarName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  // Address picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing[4],
    maxHeight: '70%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary + '40',
    alignSelf: 'center',
    marginBottom: spacing[4],
  },
  modalTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.xl,
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: spacing[4],
  },
  modalScroll: {
    flexGrow: 0,
  },
  addrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    marginBottom: spacing[2],
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  addrRowActive: {
    backgroundColor: colors.primary + '0D',
    borderColor: colors.primary + '40',
  },
  addrIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border + '80',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addrIconCircleActive: {
    backgroundColor: colors.primary + '20',
  },
  addrRowText: {
    flex: 1,
    alignItems: 'flex-end',
  },
  addrLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  addrLabelActive: {
    color: colors.primary,
  },
  addrDetail: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },
  emptyAddresses: {
    alignItems: 'center',
    paddingVertical: spacing[8],
    gap: spacing[3],
  },
  emptyAddressesText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyAddressesHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    marginTop: spacing[3],
  },
  addAddressBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.base,
    color: '#FFFFFF',
  },
  // Fix 1 — active order banner
  activeOrderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    padding: spacing[3],
    marginTop: spacing[3],
  },
  activeOrderTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.sm,
    color: '#fff',
    textAlign: 'right',
  },
  activeOrderStatus: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'right',
  },

  // NEW DESIGN STYLES
  newHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    backgroundColor: '#FCF3DC',
    zIndex: 50,
  },
  headerCircularBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E0D5',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 3 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.08)' },
    }),
  },
  headerAddressBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: spacing[2],
  },
  addressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addressLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: '#8A7A5F',
  },
  addressName: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: '#1C1C23',
    marginTop: 1,
  },
  newScroll: {
    paddingTop: spacing[3],
    paddingHorizontal: spacing[4],
  },
  newSearchWrap: {
    marginTop: spacing[2],
    marginBottom: spacing[4],
  },
  newSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24, // highly rounded
    height: 52,
    paddingHorizontal: spacing[4],
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E5E0D5',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  newSearchInput: {
    flex: 1,
    height: '100%',
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.base,
    color: '#1C1C23',
    paddingRight: 32, // space for search icon on the right
    paddingLeft: 32, // space for filter button on the left
  },
  newSearchIconRight: {
    position: 'absolute',
    right: spacing[4],
  },
  newFilterBtn: {
    position: 'absolute',
    left: spacing[4],
    backgroundColor: 'rgba(230, 120, 30, 0.08)',
    padding: 6,
    borderRadius: 8,
  },
  newBannerSection: {
    marginTop: spacing[2],
    marginBottom: spacing[4],
  },
  carouselDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing[3],
    gap: 6,
  },
  carouselDot: {
    height: 6,
    borderRadius: 3,
  },
  carouselDotActive: {
    width: 20,
    backgroundColor: colors.primary,
  },
  carouselDotInactive: {
    width: 6,
    backgroundColor: '#E5E0D5',
  },
  newSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[5],
    marginBottom: spacing[3],
  },
  newSectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    color: '#1C1C23',
  },
  newSectionLink: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.primary,
  },
  newCategoriesScroll: {
    paddingBottom: spacing[2],
    gap: spacing[4],
    flexDirection: 'row',
  },
  newCategoryItem: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing[2],
  },
  newCategoryBox: {
    width: 72,
    height: 72,
    backgroundColor: '#FFFFFF',
    borderRadius: 18, // slightly more rounded
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E0D5',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 3px 6px rgba(0,0,0,0.08)' },
    }),
  },
  newCategoryBoxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  newCategoryText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.xs,
    color: '#1C1C23',
  },
  newCategoryTextActive: {
    color: colors.primary,
  },
  newLocationTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newLocationTagText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: '#8A7A5F',
  },
  newGrid: {
    gap: spacing[4],
    marginTop: spacing[2],
  },
  newCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24, // large border radius like the image
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E0D5',
    marginBottom: spacing[3],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 6 },
      android: { elevation: 3 },
      web: { boxShadow: '0 4px 8px rgba(0,0,0,0.08)' },
    }),
  },
  newCardImageWrap: {
    height: 180,
    position: 'relative',
  },
  newCardImage: {
    width: '100%',
    height: '100%',
  },
  newCardImagePlaceholder: {
    backgroundColor: '#F5F5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newStatusBadge: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  newStatusBadgeText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 11,
  },
  newRatingBadge: {
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
  newRatingText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: '#1C1C23',
  },
  newCardBody: {
    padding: spacing[4],
  },
  newCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newCardRightCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  newCardLeftCol: {
    alignItems: 'flex-end',
  },
  newCardTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: '#1C1C23',
    textAlign: 'right',
  },
  newCardDesc: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: '#8A7A5F',
    textAlign: 'right',
    marginTop: 4,
  },
  newMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  newMetaText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: '#8A7A5F',
  },

  // Disabled business card
  disabledCard: {
    opacity: 0.8,
    borderColor: '#E5E0D5',
    borderStyle: 'dashed',
  },
  deliverableBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(22,90,52,0.85)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deliverableBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: '#fff',
    flex: 1,
    textAlign: 'right',
  },
  disabledCardHint: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.secondary,
    textAlign: 'right',
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  // Search enhancements
  newSearchBarFocused: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  newSearchClearBtn: {
    position: 'absolute',
    left: spacing[4],
    padding: 4,
  },

  // Full-page search overlay
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FCF3DC',
    zIndex: 100,
  },
  searchOverlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[2],
    backgroundColor: '#FCF3DC',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchOverlayBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchOverlayInput: {
    flex: 1,
    marginTop: 0,
    marginBottom: 0,
  },
  searchSectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: spacing[3],
    marginTop: spacing[2],
  },
  searchHint: {
    alignItems: 'center',
    paddingTop: spacing[16],
    gap: spacing[3],
  },
  searchHintText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSizes.base,
    color: colors.textMuted,
    textAlign: 'center',
  },
  searchHintSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  // Business result card
  searchBusinessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[3],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  searchBusinessImg: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.border + '60',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  searchBusinessName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  searchBusinessMeta: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },
  // Product result card — same style as business card
  searchProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing[3],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: '#E5E0D5',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 3 },
      web: { boxShadow: '0 3px 6px rgba(0,0,0,0.07)' },
    }),
  },
  searchProductImg: {
    width: 80,
    height: 80,
    borderRadius: radius.lg,
    backgroundColor: colors.border + '60',
    overflow: 'hidden',
    flexShrink: 0,
  },
  searchProductName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  searchProductBusiness: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.xs,
    color: colors.primary,
    textAlign: 'right',
  },
  searchProductDesc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'right',
  },
  searchProductPrice: {
    fontFamily: fontFamily.extrabold,
    fontSize: fontSizes.lg,
    color: colors.primary,
  },

  // Stores horizontal scroll
  storesHorizontalScroll: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[3],
    flexDirection: 'row',
  },
  storeHCard: {
    width: 130,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E0D5',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 5 },
      android: { elevation: 3 },
      web: { boxShadow: '0 3px 6px rgba(0,0,0,0.07)' },
    }),
  },
  storeHCardImg: {
    width: '100%',
    height: 100,
    backgroundColor: '#F5F5F0',
    position: 'relative',
  },
  storeHCardName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.sm,
    color: '#1C1C23',
    textAlign: 'right',
    padding: spacing[2],
    paddingBottom: 2,
  },
  storeHCardTag: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.xs,
    color: colors.secondary,
    textAlign: 'right',
    paddingHorizontal: spacing[2],
    paddingBottom: spacing[2],
  },
});

