import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View, Platform, RefreshControl, TextInput, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, Clock, Bike, MapPin, Store, Plus, Minus, ArrowRight, Share2, Heart, Banknote, Search, Package } from 'lucide-react-native';
import { businessesApi, offersApi, productsApi, categoriesApi, businessCategoriesApi, BASE_URL } from '@shu/api-client';
import { CategoryGrid } from '../../../components/store/CategoryGrid';
import { MainCategoryBar } from '../../../components/store/MainCategoryBar';
import { SubCategoryBar } from '../../../components/store/SubCategoryBar';
import { useCartStore } from '../../../src/stores/cart.store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VariantPicker, type CartAddPayload } from '../../../components/VariantPicker';
import { fontFamily, spacing } from '../../../src/theme';

const mediaUrl = (path: string | null | undefined): string | null =>
  !path ? null : path.startsWith('http') ? path : `${BASE_URL}${path}`;

const storeColors = {
  background: '#FCF3DC',
  surface: '#ffffff',
  primary: '#974800',
  primaryContainer: '#e6781e',
  secondary: '#296a43',
  textPrimary: '#1b1b22',
  textMuted: '#564337',
  border: '#e4e1eb',
  success: '#22C55E',
};

export default function StoreBusinessDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const addItem    = useCartStore((s) => s.addItem);
  const clearCart  = useCartStore((s) => s.clear);
  const cartItems  = useCartStore((s) => s.items);
  const cartTotal  = useCartStore((s) => s.total());
  const cartQty    = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const [storeSearch, setStoreSearch] = useState('');
  const [selectedMainCat, setSelectedMainCat] = useState<any | null>(null);
  const [selectedSubCat, setSelectedSubCat] = useState<any | null>(null);
  const [pickerProduct, setPickerProduct] = useState<any | null>(null);

  React.useEffect(() => {
    setSelectedMainCat(null);
    setSelectedSubCat(null);
    setStoreSearch('');
  }, [id]);

  const { data: business, isLoading } = useQuery({
    queryKey: ['business', id],
    queryFn: () => businessesApi.getById(id!),
    enabled: !!id,
  });

  const { data: storeCategories = [] } = useQuery({
    queryKey: ['store-categories', id],
    queryFn: async () => {
      const templates = await businessCategoriesApi.getForBusiness(id!);
      if (templates.length > 0) {
        return templates.map((t: any) => ({ ...t, isTemplate: true }));
      }
      return categoriesApi.listByBusiness(id!);
    },
    enabled: !!id && business?.type === 'STORE',
  });

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (selectedSubCat) {
          setSelectedSubCat(null);
          return true; // handled
        }
        if (selectedMainCat) {
          setSelectedMainCat(null);
          return true; // handled
        }
        setSelectedMainCat(null);
        setSelectedSubCat(null);
        return false;
      };
      
      if (Platform.OS === 'android') {
        const { BackHandler } = require('react-native');
        BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
      }
    }, [selectedMainCat, selectedSubCat])
  );

  const { data: businessOffers = [] } = useQuery({
    queryKey: ['offers-for-business', id],
    queryFn: () => offersApi.forBusiness(id!),
    enabled: !!id,
  });

  const discountMap = new Map<string, number>();
  const categoryDiscountMap = new Map<string, number>();
  for (const offer of businessOffers) {
    for (const op of offer.offerProducts) {
      if (op.productId) {
        const existing = discountMap.get(op.productId) ?? 0;
        if (Number(op.discountPct) > existing) discountMap.set(op.productId, Number(op.discountPct));
      } else if (op.categoryName) {
        const existing = categoryDiscountMap.get(op.categoryName) ?? 0;
        if (Number(op.discountPct) > existing) categoryDiscountMap.set(op.categoryName, Number(op.discountPct));
      }
    }
  }

  const getDiscountPct = (p: any): number => {
    if (discountMap.has(p.id)) return discountMap.get(p.id)!;
    if (p.category && categoryDiscountMap.has(p.category)) return categoryDiscountMap.get(p.category)!;
    return 0;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['business', id] });
    setRefreshing(false);
  };

  const handleStoreAddToCart = (payload: CartAddPayload) => {
    const result = addItem(
      {
        productId: payload.productId,
        name: payload.name,
        price: payload.price,
        variantId: payload.variantId,
        variantName: payload.variantName,
        imageUrl: payload.imageUrl,
      },
      business!.id,
      business!.areaId,
      'STORE',
    );

    if (result === 'different_business') {
      if (Platform.OS === 'web') {
        if (window.confirm('سلتك تحتوي على منتجات من منشأة أخرى. هل تريد إفراغها والبدء بطلب جديد؟')) {
          clearCart();
          for (let i = 0; i < payload.quantity; i++) {
            addItem(
              { productId: payload.productId, name: payload.name, price: payload.price, variantId: payload.variantId, variantName: payload.variantName, imageUrl: payload.imageUrl },
              business!.id, business!.areaId, 'STORE'
            );
          }
        }
        return;
      }
      Alert.alert(
        'تنبيه السلة',
        'سلتك تحتوي على منتجات من متجر آخر. هل تريد إفراغها والبدء بطلب جديد؟',
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'إفراغ والبدء',
            style: 'destructive',
            onPress: () => {
              clearCart();
              for (let i = 0; i < payload.quantity; i++) {
                addItem(
                  { productId: payload.productId, name: payload.name, price: payload.price, variantId: payload.variantId, variantName: payload.variantName, imageUrl: payload.imageUrl },
                  business!.id, business!.areaId, 'STORE'
                );
              }
            },
          },
        ],
      );
    } else if (payload.quantity > 1) {
      for (let i = 1; i < payload.quantity; i++) {
        addItem(
          { productId: payload.productId, name: payload.name, price: payload.price, variantId: payload.variantId, variantName: payload.variantName, imageUrl: payload.imageUrl },
          business!.id, business!.areaId, 'STORE'
        );
      }
    }
  };

  const { width: windowWidth } = useWindowDimensions();

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={storeColors.primary} />
      </View>
    );
  }

  if (!business) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={{ color: storeColors.textMuted }}>المتجر غير موجود</Text>
      </View>
    );
  }

  const products = business.products || [];
  const subCategories = selectedMainCat?.children || [];

  const storeFilteredProducts = products.filter((p: any) => {
    const matchesSearch = !storeSearch.trim() || p.name.includes(storeSearch.trim());
    if (!matchesSearch) return false;

    if (selectedSubCat) {
      const pCatId = p.templateId || p.categoryId;
      return pCatId === selectedSubCat.id;
    } else if (selectedMainCat) {
      const mainId = selectedMainCat.id;
      const childrenIds = subCategories.map((c: any) => c.id);
      const pCatId = p.templateId || p.categoryId;
      return pCatId === mainId || childrenIds.includes(pCatId);
    }
    return true;
  });


  const numCols = 2;
  const horizontalPadding = spacing[6];
  const gridGap = spacing[5];
  const cardWidth = (windowWidth - horizontalPadding * 2 - gridGap * (numCols - 1)) / numCols;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: cartQty > 0 ? 100 : spacing[8] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[storeColors.primary]} tintColor={storeColors.primary} />
        }
      >
        {/* ── Hero image ── */}
        <View style={styles.heroWrap}>
          {business.imageUrl ? (
            <Image source={{ uri: mediaUrl(business.imageUrl)! }} style={styles.heroImg} contentFit="cover" />
          ) : (
            <View style={[styles.heroImg, styles.heroPlaceholder]}>
              <View style={styles.heroIcon}>
                <Store size={48} color={storeColors.secondary} />
              </View>
            </View>
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'transparent', 'transparent']}
            style={styles.heroGradient}
            pointerEvents="none"
          />
          <View style={[styles.heroActions, { top: Platform.OS === 'ios' ? insets.top || spacing[4] : spacing[4] }]}>
            <Pressable style={styles.heroBtn} onPress={() => {
              setSelectedMainCat(null);
              setSelectedSubCat(null);
              router.back();
            }}>
              <ArrowRight size={24} color={storeColors.textPrimary} />
            </Pressable>
            <View style={styles.heroActionsRight}>
              <Pressable style={styles.heroBtn}>
                <Share2 size={22} color={storeColors.textPrimary} />
              </Pressable>
              <Pressable style={styles.heroBtn}>
                <Heart size={22} color={storeColors.textPrimary} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── Info block ── */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={styles.infoTitleWrap}>
              <Text style={styles.businessName}>{business.name}</Text>
              <Text style={styles.businessLocation}>{business.area?.city || 'فلسطين'} - {business.area?.name || ''}</Text>
              {business.addressDetail ? (
                <View style={styles.addressRow}>
                  <MapPin size={14} color={storeColors.textMuted} />
                  <Text style={styles.addressText}>{business.addressDetail}</Text>
                </View>
              ) : null}
              {business.openTime && business.closeTime ? (
                <View style={styles.addressRow}>
                  <Clock size={14} color={storeColors.textMuted} />
                  <Text style={styles.addressText}>{business.openTime} - {business.closeTime}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.ratingBadge}>
              <Star size={16} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.ratingText}>{business.rating ? business.rating.toFixed(1) : '4.8'}</Text>
            </View>
          </View>

          <View style={styles.infoDetailsRow}>
            <View style={styles.detailItem}>
              <Clock size={18} color={storeColors.primaryContainer} />
              <Text style={styles.detailText}>25-35 دقيقة</Text>
            </View>
            <View style={styles.detailItem}>
              <Bike size={18} color={storeColors.primaryContainer} />
              <Text style={styles.detailText}>توصيل {business.deliveryType === 'SELF' ? 0 : (business.area?.deliveryFee ?? 0)} ₪</Text>
            </View>
            <View style={styles.detailItem}>
              <Banknote size={18} color={storeColors.primaryContainer} />
              <Text style={styles.detailText}>دفع نقدي</Text>
            </View>
          </View>
          {business.minimumOrder ? (
            <View style={styles.minimumOrderBadge}>
              <Text style={styles.minimumOrderText}>الحد الأدنى للطلب: {Number(business.minimumOrder)} ₪</Text>
            </View>
          ) : null}
        </View>

        {/* Search bar */}
        <View style={styles.storeSearchWrap}>
          <View style={styles.storeSearchBar}>
            <Search size={18} color={storeColors.textMuted} style={styles.storeSearchIcon} />
            <TextInput
              style={styles.storeSearchInput}
              placeholder="ابحث في المتجر..."
              placeholderTextColor={storeColors.textMuted}
              value={storeSearch}
              onChangeText={setStoreSearch}
              textAlign="right"
              returnKeyType="search"
            />
          </View>
        </View>

        {/* Store Home vs Category View */}
        {!selectedMainCat ? (
          <>
            <CategoryGrid
              categories={storeCategories as any}
              onSelect={(cat) => {
                setSelectedMainCat(cat);
                setSelectedSubCat(null);
              }}
            />
          </>
        ) : (
          <>
            <MainCategoryBar
              categories={storeCategories as any}
              selected={selectedMainCat}
              onSelect={(cat) => {
                setSelectedMainCat(cat);
                setSelectedSubCat(null);
              }}
            />

            <SubCategoryBar
              subCategories={subCategories}
              selected={selectedSubCat}
              onSelect={setSelectedSubCat}
            />

            <View style={[styles.storeGrid, { paddingHorizontal: horizontalPadding, gap: gridGap }]}>
              {storeFilteredProducts.length === 0 ? (
                <Text style={styles.emptyText}>لا توجد منتجات تطابق البحث</Text>
              ) : (
                storeFilteredProducts.reduce((rows: any[][], p: any, idx: number) => {
                  if (idx % numCols === 0) rows.push([p]);
                  else rows[rows.length - 1].push(p);
                  return rows;
                }, []).map((row: any[], rowIdx: number) => (
                  <View key={rowIdx} style={[styles.storeGridRow, { gap: gridGap }]}>
                    {row.map((p: any) => <StoreProductCard
                      key={p.id}
                      product={p}
                      width={cardWidth}
                      isOpen={business.isOpen}
                      onAdd={() => p.hasVariants ? setPickerProduct(p) : handleStoreAddToCart({
                        productId: p.id,
                        name: p.name,
                        price: p.price,
                        quantity: 1
                      })}
                      onPress={() => setPickerProduct(p)}
                      discountPct={getDiscountPct(p)}
                    />)}
                    {row.length < numCols && <View style={styles.storeGridFiller} />}
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Floating Cart Bar */}
      {cartQty > 0 && (
        <View style={[styles.cartBarContainer, { paddingBottom: Platform.OS === 'ios' ? insets.bottom || spacing[4] : spacing[4] }]}>
          <Pressable style={styles.cartBar} onPress={() => router.push('/cart')}>
            <View style={styles.cartBarLeft}>
              <View style={styles.cartBarBadge}>
                <Text style={styles.cartBarBadgeText}>{cartQty}</Text>
              </View>
              <Text style={styles.cartBarText}>عرض السلة</Text>
            </View>
            <Text style={styles.cartBarTotal}>{cartTotal} ₪</Text>
          </Pressable>
        </View>
      )}

      {/* Variant Picker Modal */}
      {pickerProduct && (
        <VariantPicker
          visible={!!pickerProduct}
          product={pickerProduct}
          onClose={() => setPickerProduct(null)}
          onAddToCart={handleStoreAddToCart}
        />
      )}
    </View>
  );
}

function StoreProductCard({ product, isOpen, onPress, discountPct }: { product: any; isOpen: boolean; onPress: () => void; discountPct: number }) {
  const variants = (product.variants ?? []).filter((v: any) => v.isAvailable);
  const hasVariants = product.hasVariants && variants.length > 0;

  const minPrice = hasVariants
    ? Math.min(...variants.map((v: any) => Number(v.price)))
    : Number(product.price);

  const priceLabel = hasVariants
    ? `من ${minPrice.toFixed(2)} ₪`
    : `${Number(product.price).toFixed(2)} ₪${product.unit ? ` / ${product.unit}` : ''}`;

  const discountedPriceLabel = discountPct > 0 && !hasVariants
    ? `${(Number(product.price) * (1 - discountPct / 100)).toFixed(2)} ₪`
    : null;

  const outOfStock = product.stock === 0;
  const lowStock = product.stock !== null && product.stock !== undefined && product.stock > 0 && product.stock <= 5;
  const unavailable = !product.isAvailable || !isOpen || outOfStock;

  return (
    <Pressable
      style={[cardStyles.storeCard, unavailable && cardStyles.storeCardUnavailable]}
      onPress={unavailable ? undefined : onPress}
    >
      <View style={cardStyles.storeCardImageWrap}>
        {product.imageUrl ? (
          <Image
            source={{ uri: (product.imageUrl.startsWith('http') ? product.imageUrl : `${BASE_URL}${product.imageUrl}`) }}
            style={cardStyles.storeCardImage}
            contentFit="cover"
          />
        ) : (
          <View style={[cardStyles.storeCardImage, cardStyles.storeCardImagePlaceholder]}>
            <Package size={32} color={storeColors.border} />
          </View>
        )}

        {discountPct > 0 && (
          <View style={cardStyles.discountBadge}>
            <Text style={cardStyles.discountBadgeText}>-{discountPct}%</Text>
          </View>
        )}

        {outOfStock && (
          <View style={cardStyles.outOfStockOverlay}>
            <Text style={cardStyles.outOfStockText}>نفد المخزون</Text>
          </View>
        )}

        {lowStock && !outOfStock && (
          <View style={cardStyles.lowStockBadge}>
            <Text style={cardStyles.lowStockText}>آخر {product.stock}</Text>
          </View>
        )}
      </View>

      <View style={cardStyles.storeCardInfo}>
        <Text style={cardStyles.storeCardName} numberOfLines={2}>{product.name}</Text>
        <View style={cardStyles.priceRow}>
          <Text style={[cardStyles.storeCardPrice, discountedPriceLabel && cardStyles.storeCardPriceOld]}>{priceLabel}</Text>
          {discountedPriceLabel && <Text style={cardStyles.storeCardPriceDiscounted}>{discountedPriceLabel}</Text>}
        </View>

        {!unavailable && (
          <View style={cardStyles.storeCardAddBtn}>
            <Plus size={16} color="#fff" strokeWidth={2.5} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const cardStyles = StyleSheet.create({
  storeCard: {
    flex: 1,
    backgroundColor: storeColors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: storeColors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  storeCardUnavailable: {
    opacity: 0.6,
  },
  storeCardImageWrap: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
    backgroundColor: storeColors.background,
  },
  storeCardImage: {
    width: '100%',
    height: '100%',
  },
  storeCardImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: storeColors.primaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: storeColors.surface,
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockText: {
    fontFamily: fontFamily.bold,
    color: '#fff',
    fontSize: 12,
  },
  lowStockBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lowStockText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: '#fff',
  },
  storeCardInfo: {
    padding: spacing[3],
    alignItems: 'flex-end',
  },
  storeCardName: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: storeColors.textPrimary,
    textAlign: 'right',
    height: 40,
    marginBottom: spacing[1],
  },
  priceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  storeCardPrice: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: storeColors.primary,
  },
  storeCardPriceOld: {
    textDecorationLine: 'line-through',
    color: storeColors.textMuted,
    fontSize: 12,
  },
  storeCardPriceDiscounted: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: storeColors.primaryContainer,
  },
  storeCardAddBtn: {
    position: 'absolute',
    bottom: spacing[3],
    left: spacing[3],
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: storeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: storeColors.background,
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: storeColors.background,
    justifyContent: 'center',
    alignItems: 'center'
  },
  heroWrap: {
    height: 200,
    position: 'relative',
    width: '100%'
  },
  heroImg: {
    width: '100%',
    height: '100%'
  },
  heroPlaceholder: {
    backgroundColor: storeColors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: storeColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroActions: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  heroActionsRight: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  heroBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: storeColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    backgroundColor: storeColors.surface,
    marginHorizontal: spacing[4],
    borderRadius: 20,
    marginTop: -30,
    padding: spacing[4],
    zIndex: 10,
    borderWidth: 1,
    borderColor: storeColors.border,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  infoTitleWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  businessName: {
    fontSize: 22,
    fontFamily: fontFamily.bold,
    color: storeColors.textPrimary,
    marginBottom: 4,
    textAlign: 'right',
  },
  businessLocation: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: storeColors.textMuted,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[1],
  },
  addressText: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: storeColors.textMuted,
    flexShrink: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCF3DC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontFamily: fontFamily.bold,
    color: storeColors.textPrimary,
  },
  infoDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: spacing[4],
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderColor: storeColors.border,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: storeColors.textPrimary,
  },
  minimumOrderBadge: {
    marginTop: spacing[3],
    backgroundColor: storeColors.border,
    padding: spacing[2],
    borderRadius: 8,
    alignItems: 'center',
  },
  minimumOrderText: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    color: storeColors.textPrimary,
  },
  storeSearchWrap: {
    paddingHorizontal: spacing[4],
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  storeSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: storeColors.surface,
    borderWidth: 1,
    borderColor: storeColors.border,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: spacing[3],
  },
  storeSearchIcon: {
    marginRight: spacing[2],
  },
  storeSearchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: storeColors.textPrimary,
  },
  storeCatScroll: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    gap: spacing[2],
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  storeCatBtn: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: 20,
    backgroundColor: storeColors.surface,
    borderWidth: 1,
    borderColor: storeColors.border,
  },
  storeCatBtnActive: {
    backgroundColor: storeColors.primary,
    borderColor: storeColors.primary,
  },
  storeCatText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: storeColors.textMuted,
  },
  storeCatTextActive: {
    color: storeColors.surface,
  },
  specialCatBtn: {
    backgroundColor: storeColors.primaryContainer + '20',
    borderColor: storeColors.primaryContainer,
  },
  specialCatBtnActive: {
    backgroundColor: storeColors.primaryContainer,
    borderColor: storeColors.primaryContainer,
  },
  specialCatText: {
    color: storeColors.primaryContainer,
  },
  specialCatTextActive: {
    color: storeColors.surface,
  },
  storeGrid: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[6],
    paddingBottom: spacing[6],
  },
  storeGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[5],
    gap: spacing[5],
  },
  storeGridFiller: {
    flex: 1,
  },
  emptyText: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: storeColors.textMuted,
    textAlign: 'center',
    marginTop: spacing[8],
  },
  cartBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: spacing[4],
  },
  cartBar: {
    backgroundColor: storeColors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    height: 56,
    borderRadius: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  cartBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  cartBarBadge: {
    backgroundColor: '#fff',
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  cartBarBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: storeColors.primary,
  },
  cartBarText: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: '#fff',
  },
  cartBarTotal: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: '#fff',
  },
});
