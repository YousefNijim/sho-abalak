import { useState, useEffect, useRef } from 'react';
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
import {
  Search,
  ShoppingCart,
  MapPin,
  UtensilsCrossed,
  Store,
  Coffee,
  SlidersHorizontal,
  Star,
  Clock,
  Bike,
  ImageIcon,
  ChevronLeft,
  ChevronDown,
  Package,
  Home as HomeIcon,
  Check,
  Plus,
  LayoutGrid,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';
import { businessesApi, tagsApi, areasApi, bannersApi, BASE_URL } from '@shu/api-client';
import type { Tag, Banner } from '@shu/api-client';

const mediaUrl = (path: string | null | undefined): string | null =>
  !path ? null : path.startsWith('http') ? path : `${BASE_URL}${path}`;
import { useAuthStore } from '../../src/stores/auth.store';
import { useCartStore } from '../../src/stores/cart.store';
import { useActiveOrderStore } from '../../src/stores/active-order.store';
import { useSavedAddressesStore } from '../../src/stores/saved-addresses.store';
import { addressesApi } from '@shu/api-client';
import { getCategoryImage } from '../../src/constants/CategoryImages';
import { NotificationBell } from '../../src/components/NotificationBell';

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
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const activeOrder = useActiveOrderStore((s) => s.order);

  const selectedAddressId = useSavedAddressesStore((s) => s.selectedId);
  const selectAddress = useSavedAddressesStore((s) => s.select);

  // Fetch addresses from server instead of local store to ensure consistency
  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressesApi.list(),
    enabled: !!user,
  });

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) ?? addresses[0] ?? null;

  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [addressPickerVisible, setAddressPickerVisible] = useState(false);
  
  const bannerScrollRef = useRef<ScrollView>(null);
  const bannerIndexRef = useRef(0);

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
    queryKey: ['businesses', 'FOOD', selectedTagId, search, selectedAddress?.areaId],
    queryFn: () =>
      businessesApi.list({
        type: 'FOOD',
        tagId: selectedTagId || undefined,
        search: search || undefined,
        areaId: selectedAddress?.areaId || undefined,
      }),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['businesses'] });
    setRefreshing(false);
  };

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      bannerIndexRef.current = (bannerIndexRef.current + 1) % activeBanners.length;
      bannerScrollRef.current?.scrollTo({
        x: bannerIndexRef.current * (Dimensions.get('window').width - spacing[4]),
        animated: true,
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [activeBanners]);

  const bottomInset = insets.bottom;

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
        <Pressable style={styles.addressBarRow} onPress={() => setAddressPickerVisible(true)}>
          <View style={styles.addressIconWrap}>
            <MapPin size={24} color={colors.primary} />
          </View>
          <View style={styles.addressBarTextCol}>
            <View style={styles.addressBarLabelRow}>
              <Text style={styles.addressBarLabel}>التوصيل إلى</Text>
              <ChevronDown size={14} color={colors.textMuted} />
            </View>
            <Text style={styles.addressBarName} numberOfLines={1}>
              {selectedAddress ? selectedAddress.label : 'اختر عنوان التوصيل'}
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Address picker modal */}
      <Modal visible={addressPickerVisible} transparent animationType="slide" onRequestClose={() => setAddressPickerVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAddressPickerVisible(false)} />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing[4] }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>اختر عنوان التوصيل</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
            {addresses.length === 0 ? (
              <View style={styles.emptyAddresses}>
                <MapPin size={40} color={colors.border} />
                <Text style={styles.emptyAddressesText}>لا توجد عناوين محفوظة</Text>
                <Text style={styles.emptyAddressesHint}>أضف عنواناً لتسريع عملية الطلب</Text>
              </View>
            ) : (
              addresses.map((a) => {
                const isActive = (selectedAddress?.id ?? null) === a.id || (selectedAddressId === null && addresses[0]?.id === a.id);
                return (
                  <Pressable
                    key={a.id}
                    style={[styles.addrRow, isActive && styles.addrRowActive]}
                    onPress={() => { selectAddress(a.id); setAddressPickerVisible(false); }}
                  >
                    <View style={[styles.addrIconCircle, isActive && styles.addrIconCircleActive]}>
                      <HomeIcon size={18} color={isActive ? colors.primary : colors.textMuted} />
                    </View>
                    <View style={styles.addrRowText}>
                      <Text style={[styles.addrLabel, isActive && styles.addrLabelActive]}>{a.label}</Text>
                      <Text style={styles.addrDetail} numberOfLines={1}>{a.detail}</Text>
                    </View>
                    {isActive && <Check size={18} color={colors.primary} />}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
          <Pressable
            style={styles.addAddressBtn}
            onPress={() => { setAddressPickerVisible(false); router.push('/profile/addresses'); }}
          >
            <Plus size={18} color={colors.white} />
            <Text style={styles.addAddressBtnText}>إضافة عنوان جديد</Text>
          </Pressable>
        </View>
      </Modal>

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
            <ChevronLeft size={20} color="#fff" />
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
                  onPress={() => {
                    // if banner.linkUrl is a valid deep link or URL, it can be handled here.
                  }}
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

        {/* Tag chips (FOOD section — Categories) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>الأقسام</Text>
          <Pressable onPress={() => setSelectedTagId(null)}>
            <Text style={styles.sectionLink}>عرض الكل</Text>
          </Pressable>
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
          <Text style={styles.sectionTitle}>المنشآت القريبة</Text>
          <View style={styles.locationTag}>
            <MapPin size={16} color={colors.textMuted} />
            <Text style={styles.locationTagText}>{locationTagText}</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCF3DC', // background-cream
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    backgroundColor: '#FCF3DC',
    zIndex: 50,
  },
  headerRight: {
    flexDirection: 'row-reverse',
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
    flexDirection: 'row-reverse',
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
    flexDirection: 'row-reverse',
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
    flexDirection: 'row-reverse',
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
    left: spacing[3],
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
    flexDirection: 'row-reverse',
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
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.textPrimary, // Design has dark text next to star
  },
  cardDesc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.base,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },
  cardMeta: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[3],
  },
  metaItem: {
    flexDirection: 'row-reverse',
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
    marginBottom: 0, // margin is handled by scroll
  },
  addressBarRow: {
    flexDirection: 'row-reverse',
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
    flexDirection: 'row-reverse',
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
    flexDirection: 'row-reverse',
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
    flexDirection: 'row-reverse',
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
    flexDirection: 'row-reverse',
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
});

