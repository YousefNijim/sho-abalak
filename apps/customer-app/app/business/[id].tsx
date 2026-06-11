import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View, Platform, RefreshControl, TextInput, FlatList, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Star,
  Clock,
  Bike,
  MapPin,
  UtensilsCrossed,
  Store,
  ChefHat,
  Plus,
  Minus,
  ArrowRight,
  Share2,
  Heart,
  Banknote,
  Search,
  Package,
} from 'lucide-react-native';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';
import { businessesApi, offersApi, productsApi, categoriesApi, BASE_URL } from '@shu/api-client';
import { CategoryGrid } from '../../components/store/CategoryGrid';
import { MainCategoryBar } from '../../components/store/MainCategoryBar';
import { SubCategoryBar } from '../../components/store/SubCategoryBar';
import type { Product } from '@shu/api-client';

const mediaUrl = (path: string | null | undefined): string | null =>
  !path ? null : path.startsWith('http') ? path : `${BASE_URL}${path}`;
import { useCartStore } from '../../src/stores/cart.store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VariantPicker, type CartAddPayload } from '../../components/VariantPicker';

const TYPE_ICON: Record<string, { Icon: typeof UtensilsCrossed; color: string }> = {
  FOOD:  { Icon: UtensilsCrossed, color: colors.primary },
  STORE: { Icon: Store,           color: colors.secondary },
};

export default function BusinessDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const addItem    = useCartStore((s) => s.addItem);
  const updateQty  = useCartStore((s) => s.updateQty);
  const clearCart  = useCartStore((s) => s.clear);
  const cartItems  = useCartStore((s) => s.items);
  const cartTotal  = useCartStore((s) => s.total());
  const cartQty    = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const [tab, setTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // STORE-only state
  const [storeSearch, setStoreSearch] = useState('');
  const [storeCatTabId, setStoreCatTabId] = useState<string | null>(null);
  const [pickerProduct, setPickerProduct] = useState<any | null>(null);

  const { data: business, isLoading } = useQuery({
    queryKey: ['business', id],
    queryFn: () => businessesApi.getById(id!),
    enabled: !!id,
  });

  const { data: storeCategories = [] } = useQuery({
    queryKey: ['categories', id],
    // @ts-ignore
    queryFn: () => categoriesApi.listByBusiness(id!),
    enabled: !!id && business?.type === 'STORE',
  });

  const [selectedMainCat, setSelectedMainCat] = useState<any | null>(null);
  const [selectedSubCat, setSelectedSubCat] = useState<any | null>(null);

  const { data: dynamicProducts = [] } = useQuery({
    queryKey: ['products', id, selectedSubCat?.id || selectedMainCat?.id],
    // @ts-ignore
    queryFn: () => productsApi.listByBusiness(id!, selectedSubCat?.id || selectedMainCat?.id),
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
        return false; // let default back happen
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [selectedSubCat, selectedMainCat])
  );

  const { data: businessOffers = [] } = useQuery({
    queryKey: ['offers-for-business', id],
    queryFn: () => offersApi.forBusiness(id!),
    enabled: !!id,
  });

  // Build discount maps (used by both FOOD and STORE)
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

  // ── FOOD add-to-cart (unchanged) ────────────────────────────────────────────
  const handleAdd = (p: Product) => {
    const result = addItem({ productId: p.id, name: p.name, price: p.price }, business!.id, business!.areaId);
    if (result === 'different_business') {
      if (Platform.OS === 'web') {
        if (window.confirm('سلتك تحتوي على منتجات من منشأة أخرى. هل تريد إفراغها والبدء بطلب جديد؟')) {
          clearCart();
          addItem({ productId: p.id, name: p.name, price: p.price }, business!.id, business!.areaId);
        }
        return;
      }
      Alert.alert(
        'تنبيه السلة',
        'سلتك تحتوي على منتجات من منشأة أخرى. هل تريد إفراغها والبدء بطلب جديد؟',
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'إفراغ والبدء',
            style: 'destructive',
            onPress: () => {
              clearCart();
              addItem({ productId: p.id, name: p.name, price: p.price }, business!.id, business!.areaId);
            },
          },
        ],
      );
    }
  };

  // ── STORE add-to-cart via VariantPicker ─────────────────────────────────────
  const handleStoreAddToCart = (payload: CartAddPayload) => {
    const doAdd = () => {
      for (let i = 0; i < payload.quantity; i++) {
        addItem(
          {
            productId: payload.productId,
            name: payload.name,
            price: payload.price,
            variantId: payload.variantId,
            variantName: payload.variantName,
          },
          business!.id,
          business!.areaId,
        );
      }
    };

    const result = addItem(
      {
        productId: payload.productId,
        name: payload.name,
        price: payload.price,
        variantId: payload.variantId,
        variantName: payload.variantName,
      },
      business!.id,
      business!.areaId,
    );

    if (result === 'different_business') {
      if (Platform.OS === 'web') {
        if (window.confirm('سلتك تحتوي على منتجات من منشأة أخرى. هل تريد إفراغها والبدء بطلب جديد؟')) {
          clearCart();
          // Re-add with full quantity
          for (let i = 0; i < payload.quantity; i++) {
            addItem(
              { productId: payload.productId, name: payload.name, price: payload.price, variantId: payload.variantId, variantName: payload.variantName },
              business!.id, business!.areaId,
            );
          }
        }
        return;
      }
      Alert.alert(
        'تنبيه السلة',
        'سلتك تحتوي على منتجات من منشأة أخرى. هل تريد إفراغها والبدء بطلب جديد؟',
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'إفراغ والبدء',
            style: 'destructive',
            onPress: () => {
              clearCart();
              for (let i = 0; i < payload.quantity; i++) {
                addItem(
                  { productId: payload.productId, name: payload.name, price: payload.price, variantId: payload.variantId, variantName: payload.variantName },
                  business!.id, business!.areaId,
                );
              }
            },
          },
        ],
      );
    } else if (payload.quantity > 1) {
      // First addItem already added 1, add remaining
      for (let i = 1; i < payload.quantity; i++) {
        addItem(
          { productId: payload.productId, name: payload.name, price: payload.price, variantId: payload.variantId, variantName: payload.variantName },
          business!.id, business!.areaId,
        );
      }
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!business) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={{ color: colors.textMuted }}>المنشأة غير موجودة</Text>
      </View>
    );
  }

  const isStore = business.type === 'STORE';
  const catMeta = TYPE_ICON[business.type] ?? TYPE_ICON.FOOD;
  const products = business.products || [];

  // ── FOOD view data ───────────────────────────────────────────────────────────
  const categories = ['الكل', ...Array.from(new Set(products.map((p: any) => p.category).filter(Boolean) as string[]))];
  const filteredProducts = tab === 0 ? products : products.filter((p: any) => p.category === categories[tab]);

  // ── STORE view data ──────────────────────────────────────────────────────────
  // products are now dynamicProducts, and storeCategories are the hierarchy
  const storeFilteredProducts = dynamicProducts.filter((p: any) => {
    const matchesSearch = !storeSearch.trim() || p.name.includes(storeSearch.trim());
    return matchesSearch;
  });

  // ── Shared business header ───────────────────────────────────────────────────
  const BusinessHeader = () => (
    <>
      {/* ── Hero image ── */}
      <View style={styles.heroWrap}>
        {business.imageUrl ? (
          <Image source={{ uri: mediaUrl(business.imageUrl)! }} style={styles.heroImg} contentFit="cover" />
        ) : (
          <View style={[styles.heroImg, styles.heroPlaceholder]}>
            <View style={styles.heroIcon}>
              <catMeta.Icon size={48} color={catMeta.color} />
            </View>
          </View>
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'transparent', 'transparent']}
          style={styles.heroGradient}
          pointerEvents="none"
        />

        {/* Back Button & Actions */}
        <View style={[styles.heroActions, { top: Platform.OS === 'ios' ? insets.top || spacing[4] : spacing[4] }]}>
          <Pressable style={styles.heroBtn} onPress={() => {
            if (isStore) {
              if (selectedSubCat) {
                setSelectedSubCat(null);
                return;
              }
              if (selectedMainCat) {
                setSelectedMainCat(null);
                return;
              }
            }
            router.back();
          }}>
            <ArrowRight size={24} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.heroActionsRight}>
            <Pressable style={styles.heroBtn}>
              <Share2 size={22} color={colors.textPrimary} />
            </Pressable>
            <Pressable style={styles.heroBtn}>
              <Heart size={22} color={colors.textPrimary} />
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
            {business.tags && business.tags.length > 0 ? (
              <View style={styles.tagsRow}>
                {business.tags.map((t: any) => (
                  <View key={t.id} style={styles.tagPill}>
                    <Text style={styles.tagPillText}>{t.name}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {business.addressDetail ? (
              <View style={styles.addressRow}>
                <MapPin size={14} color={colors.textMuted} />
                <Text style={styles.addressText}>{business.addressDetail}</Text>
              </View>
            ) : null}
            {business.openTime && business.closeTime ? (
              <View style={styles.addressRow}>
                <Clock size={14} color={colors.textMuted} />
                <Text style={styles.addressText}>{business.openTime} - {business.closeTime}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.ratingBadge}>
            <Star size={16} color="#733600" fill="#733600" />
            <Text style={styles.ratingText}>{business.rating ? business.rating.toFixed(1) : '4.8'}</Text>
          </View>
        </View>

        <Pressable
          style={styles.reviewsLink}
          onPress={() => router.push({ pathname: '/business/reviews', params: { businessId: id, businessName: business.name } })}
        >
          <Star size={14} color={colors.primary} fill={colors.primary} />
          <Text style={styles.reviewsLinkText}>
            {business.rating ? `${Number(business.rating).toFixed(1)} ★` : 'لا يوجد تقييم'} — اقرأ التقييمات
          </Text>
        </Pressable>

        <View style={styles.infoDetailsRow}>
          <View style={styles.detailItem}>
            <Clock size={18} color={colors.primary} />
            <Text style={styles.detailText}>25-35 دقيقة</Text>
          </View>
          <View style={styles.detailItem}>
            <Bike size={18} color={colors.primary} />
            <Text style={styles.detailText}>توصيل {business.area?.deliveryFee ?? 0} ₪</Text>
          </View>
          <View style={styles.detailItem}>
            <Banknote size={18} color={colors.primary} />
            <Text style={styles.detailText}>دفع نقدي</Text>
          </View>
        </View>
        {business.minimumOrder ? (
          <View style={styles.minimumOrderBadge}>
            <Text style={styles.minimumOrderText}>الحد الأدنى للطلب: {Number(business.minimumOrder)} ₪</Text>
          </View>
        ) : null}
      </View>
    </>
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // STORE view
  // ══════════════════════════════════════════════════════════════════════════════
  if (isStore) {
    const numCols = 2;
    const subCategories = selectedMainCat?.children || [];

    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: cartQty > 0 ? 100 : spacing[8] }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          }
        >
          <BusinessHeader />

          {/* Search bar */}
          <View style={styles.storeSearchWrap}>
            <View style={styles.storeSearchBar}>
              <Search size={18} color={colors.textMuted} style={styles.storeSearchIcon} />
              <TextInput
                style={styles.storeSearchInput}
                placeholder="ابحث في المتجر..."
                placeholderTextColor={colors.textMuted}
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
              {/* Category Grid */}
              <CategoryGrid
                categories={storeCategories}
                onSelect={(cat) => {
                  setSelectedMainCat(cat);
                  setSelectedSubCat(null);
                }}
              />

              {/* Products by section (only showing first 6 for each main cat) */}
              {storeCategories.map((mainCat) => {
                const sectionProducts = products.filter((p: any) => 
                  p.categoryId === mainCat.id || mainCat.children?.some((c: any) => c.id === p.categoryId)
                ).slice(0, 6);

                if (sectionProducts.length === 0) return null;

                return (
                  <View key={mainCat.id} style={styles.sectionWrap}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>{mainCat.name}</Text>
                      <Pressable onPress={() => { setSelectedMainCat(mainCat); setSelectedSubCat(null); }}>
                        <Text style={styles.sectionLink}>عرض الكل ←</Text>
                      </Pressable>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionScroll}>
                      {sectionProducts.map((p: any) => (
                        <StoreProductCard
                          key={p.id}
                          product={p}
                          discountPct={getDiscountPct(p)}
                          width={140}
                          onAdd={() => p.hasVariants ? setPickerProduct(p) : handleStoreAddToCart({
                            productId: p.id,
                            name: p.name,
                            price: p.price,
                            quantity: 1
                          })}
                        />
                      ))}
                    </ScrollView>
                  </View>
                );
              })}
            </>
          ) : (
            <>
              {/* Category Nav View */}
              <MainCategoryBar
                categories={storeCategories}
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

              {/* Products grid (2 columns) */}
              <View style={styles.storeGrid}>
                {storeFilteredProducts.length === 0 ? (
                  <Text style={styles.emptyText}>لا توجد منتجات تطابق البحث</Text>
                ) : (
                  // Manual 2-column grid
                  storeFilteredProducts.reduce((rows: any[][], p: any, idx: number) => {
                    if (idx % numCols === 0) rows.push([p]);
                    else rows[rows.length - 1].push(p);
                    return rows;
                  }, []).map((row: any[], rowIdx: number) => (
                    <View key={rowIdx} style={styles.storeGridRow}>
                      {row.map((p: any) => (
                        <StoreProductCard
                          key={p.id}
                          product={p}
                          discountPct={getDiscountPct(p)}
                          width="48%"
                          onAdd={() => p.hasVariants ? setPickerProduct(p) : handleStoreAddToCart({
                            productId: p.id,
                            name: p.name,
                            price: p.price,
                            quantity: 1
                          })}
                        />
                      ))}
                      {/* Filler if row has only 1 item */}
                      {row.length < numCols && <View style={{ width: '48%' }} />}
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

  // ══════════════════════════════════════════════════════════════════════════════
  // FOOD view (unchanged)
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: cartQty > 0 ? 100 : spacing[8] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >

        <BusinessHeader />

        {/* ── Category tabs ── */}
        {categories.length > 0 && (
          <View style={styles.tabsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsScrollContent}
            >
              {categories.map((cat, i) => {
                const isActive = tab === i;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setTab(i)}
                    style={[styles.tabBtn, isActive ? styles.tabBtnActive : styles.tabBtnInactive]}
                  >
                    <Text style={[styles.tabText, isActive ? styles.tabTextActive : styles.tabTextInactive]}>{cat}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Products ── */}
        <View style={styles.productsContainer}>
          {filteredProducts.length === 0 ? (
            <Text style={styles.emptyText}>لا توجد منتجات متوفرة حالياً</Text>
          ) : (
            filteredProducts.map((p: any) => {
              const discountPct = getDiscountPct(p);
              const originalPrice = Number(p.price);
              const discountedPrice = discountPct > 0
                ? Math.round(originalPrice * (1 - discountPct / 100) * 100) / 100
                : originalPrice;
              return (
              <Pressable
                key={p.id}
                style={[styles.productCard, discountPct > 0 && styles.productCardOffer]}
                onPress={() => router.push({ pathname: '/product/[id]', params: { id: p.id, businessId: business.id } })}
              >
                <View style={styles.productImageWrap}>
                  {p.imageUrl ? (
                    <Image source={{ uri: mediaUrl(p.imageUrl)! }} style={styles.productImage} contentFit="cover" />
                  ) : (
                    <View style={[styles.productImage, styles.productImagePlaceholder]}>
                      <ChefHat size={24} color={colors.border} />
                    </View>
                  )}
                  {discountPct > 0 && (
                    <View style={styles.offerBadge}>
                      <Text style={styles.offerBadgeText}>-{discountPct}%</Text>
                    </View>
                  )}
                </View>

                <View style={styles.productInfo}>
                  <View>
                    <Text style={[styles.productName, discountPct > 0 && styles.productNameOffer]}>{p.name}</Text>
                    <Text style={styles.productDesc} numberOfLines={2}>
                      {p.description || 'وصف شهي للمنتج'}
                    </Text>
                  </View>

                  <View style={styles.productFooter}>
                    <View style={{ alignItems: 'flex-start' }}>
                      <Text style={[styles.productPrice, discountPct > 0 && styles.productPriceDiscounted]}>{discountedPrice} ₪</Text>
                      {discountPct > 0 && (
                        <Text style={styles.productPriceOld}>{originalPrice} ₪</Text>
                      )}
                    </View>
                    {p.isAvailable && business.isOpen ? (() => {
                      const cartItem = cartItems.find((i) => i.productId === p.id && !i.variantId);
                      return cartItem ? (
                        <View style={styles.stepperWrap}>
                          <Pressable style={styles.stepperBtn} onPress={() => updateQty(p.id, -1)}>
                            <Minus size={16} color={colors.primary} strokeWidth={2.5} />
                          </Pressable>
                          <Text style={styles.stepperQty}>{cartItem.quantity}</Text>
                          <Pressable style={styles.stepperBtn} onPress={() => updateQty(p.id, 1)}>
                            <Plus size={16} color={colors.primary} strokeWidth={2.5} />
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable style={styles.addBtn} onPress={() => handleAdd(p)}>
                          <Plus size={20} color="#fff" strokeWidth={2.5} />
                        </Pressable>
                      );
                    })() : (
                      <View style={styles.unavailableBadge}>
                        <Text style={styles.unavailableText}>غير متوفر</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            );})
          )}
        </View>
      </ScrollView>

      {/* ── Floating Cart Bar ── */}
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
    </View>
  );
}

// ── Store Product Card component ──────────────────────────────────────────────

function StoreProductCard({
  product,
  isOpen,
  onPress,
}: {
  product: any;
  isOpen: boolean;
  onPress: () => void;
}) {
  const variants = (product.variants ?? []).filter((v: any) => v.isAvailable);
  const hasVariants = product.hasVariants && variants.length > 0;

  const minPrice = hasVariants
    ? Math.min(...variants.map((v: any) => Number(v.price)))
    : Number(product.price);

  const priceLabel = hasVariants
    ? `من ${minPrice.toFixed(2)} ₪`
    : `${Number(product.price).toFixed(2)} ₪${product.unit ? ` / ${product.unit}` : ''}`;

  const outOfStock = product.stock === 0;
  const lowStock = product.stock !== null && product.stock !== undefined && product.stock > 0 && product.stock <= 5;
  const unavailable = !product.isAvailable || !isOpen || outOfStock;

  return (
    <Pressable
      style={[styles.storeCard, unavailable && styles.storeCardUnavailable]}
      onPress={unavailable ? undefined : onPress}
    >
      {/* Image */}
      <View style={styles.storeCardImageWrap}>
        {product.imageUrl ? (
          <Image
            source={{ uri: (product.imageUrl.startsWith('http') ? product.imageUrl : `${BASE_URL}${product.imageUrl}`) }}
            style={styles.storeCardImage}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.storeCardImage, styles.storeCardImagePlaceholder]}>
            <Package size={32} color={colors.border} />
          </View>
        )}

        {/* Out of stock overlay */}
        {outOfStock && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>نفد المخزون</Text>
          </View>
        )}

        {/* Low stock badge */}
        {lowStock && (
          <View style={styles.lowStockBadge}>
            <Text style={styles.lowStockText}>آخر {product.stock}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.storeCardInfo}>
        <Text style={styles.storeCardName} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.storeCardPrice}>{priceLabel}</Text>

        {!unavailable && (
          <View style={styles.storeCardAddBtn}>
            <Plus size={16} color="#fff" strokeWidth={2.5} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCF3DC',
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: '#FCF3DC',
    justifyContent: 'center',
    alignItems: 'center'
  },

  // Hero
  heroWrap: {
    height: 256,
    position: 'relative',
    width: '100%'
  },
  heroImg: {
    width: '100%',
    height: '100%'
  },
  heroPlaceholder: {
    backgroundColor: 'rgba(151, 72, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  heroIcon: {
    width: 88,
    height: 88,
    borderRadius: radius.xl,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
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
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },

  // Info Card
  infoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing[4],
    borderRadius: radius.xl,
    marginTop: -40,
    padding: spacing[4],
    zIndex: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 6 },
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    }),
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  infoTitleWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  businessName: {
    fontSize: 26,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: 4,
    textAlign: 'right',
  },
  businessLocation: {
    fontSize: 15,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
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
    color: colors.textMuted,
    flexShrink: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
    marginTop: spacing[2],
  },
  tagPill: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: 2,
  },
  tagPillText: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    color: colors.primary,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffdbc7',
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  ratingText: {
    fontSize: 13,
    fontFamily: fontFamily.bold,
    color: '#4e2200',
  },
  reviewsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing[2],
  },
  reviewsLinkText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSizes.sm,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  minimumOrderBadge: {
    backgroundColor: colors.primary + '12',
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: spacing[1],
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  minimumOrderText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSizes.xs,
    color: colors.primary,
  },
  infoDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[5],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: 'rgba(229, 224, 213, 1)',
    marginTop: spacing[3],
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: '#564337',
  },

  // FOOD Tabs
  tabsContainer: {
    marginTop: spacing[4],
    backgroundColor: '#FCF3DC',
    paddingVertical: spacing[4],
  },
  tabsScrollContent: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    flexDirection: 'row',
  },
  tabBtn: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
  },
  tabBtnInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(229, 224, 213, 1)',
  },
  tabText: {
    fontSize: 16,
    fontFamily: fontFamily.bold,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabTextInactive: {
    color: colors.textPrimary,
    fontFamily: fontFamily.medium,
  },

  // FOOD Products
  productsContainer: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
    paddingBottom: spacing[4],
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing[3],
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: 'transparent',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    }),
  },
  productCardOffer: {
    backgroundColor: '#FFFBF0',
    borderColor: '#F59E0B' + '40',
    borderWidth: 1.5,
  },
  productNameOffer: { color: colors.primary },
  productPriceDiscounted: { color: colors.secondary },
  productPriceOld: { fontFamily: fontFamily.medium, fontSize: fontSizes.xs, color: colors.textMuted, textDecorationLine: 'line-through' },
  offerBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing[2], paddingVertical: 2 },
  offerBadgeText: { fontFamily: fontFamily.extrabold, fontSize: 10, color: '#fff' },
  productImageWrap: {
    width: 80,
    height: 80,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#f5f2fc',
    flexShrink: 0,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%'
  },
  productImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  productName: {
    fontSize: 16,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    textAlign: 'right'
  },
  productDesc: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'right',
    marginTop: 2,
    fontFamily: fontFamily.regular,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: spacing[2],
  },
  productPrice: {
    color: colors.primary,
    fontFamily: fontFamily.bold,
    fontSize: 17,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: 'rgba(230, 120, 30, 1)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  unavailableBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.border
  },
  unavailableText: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontFamily: fontFamily.semibold
  },

  // Cart bar
  cartBarContainer: {
    position: 'absolute',
    bottom: spacing[4],
    left: 0,
    right: 0,
    paddingHorizontal: spacing[4],
    backgroundColor: 'transparent',
  },
  cartBar: {
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(230, 120, 30, 1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[6],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  cartBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  cartBarBadge: {
    backgroundColor: 'rgba(78, 34, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cartBarBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: '#4e2200',
  },
  cartBarText: {
    color: '#4e2200',
    fontFamily: fontFamily.bold,
    fontSize: 16,
  },
  cartBarTotal: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: '#4e2200',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing[6],
    fontFamily: fontFamily.regular
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperQty: {
    minWidth: 24,
    textAlign: 'center',
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
  },

  // STORE-specific styles
  sectionWrap: {
    marginTop: spacing[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
  },
  sectionLink: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.sm,
    color: colors.secondary,
  },
  sectionScroll: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  storeSearchWrap: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  storeSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    height: 48,
    paddingHorizontal: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  storeSearchIcon: {
    position: 'absolute',
    right: spacing[4],
  },
  storeSearchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    paddingRight: 36,
  },
  storeCatScroll: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
    flexDirection: 'row',
  },
  storeCatBtn: {
    paddingHorizontal: spacing[4],
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  storeCatBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  storeCatText: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },
  storeCatTextActive: {
    color: '#FFFFFF',
  },
  storeGrid: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    paddingTop: spacing[2],
    gap: spacing[3],
  },
  storeGridRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  storeGridFiller: {
    flex: 1,
  },
  storeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.06)' },
    }),
  },
  storeCardUnavailable: {
    opacity: 0.6,
  },
  storeCardImageWrap: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
    backgroundColor: colors.border + '40',
  },
  storeCardImage: {
    width: '100%',
    height: '100%',
  },
  storeCardImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.sm,
    color: '#FFFFFF',
  },
  lowStockBadge: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    backgroundColor: '#F59E0B',
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  lowStockText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  storeCardInfo: {
    padding: spacing[3],
    alignItems: 'flex-end',
  },
  storeCardName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: 4,
  },
  storeCardPrice: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSizes.sm,
    color: colors.primary,
    textAlign: 'right',
  },
  storeCardAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
    alignSelf: 'flex-start',
  },
});
