import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Star,
  Clock,
  Bike,
  MapPin,
  UtensilsCrossed,
  Store,
  Coffee,
  ChefHat,
  Plus,
  Minus,
  ArrowRight,
  Share2,
  Heart,
  Banknote
} from 'lucide-react-native';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';
import { businessesApi, BASE_URL } from '@shu/api-client';
import type { Product } from '@shu/api-client';

const mediaUrl = (path: string | null | undefined): string | null =>
  !path ? null : path.startsWith('http') ? path : `${BASE_URL}${path}`;
import { useCartStore } from '../../src/stores/cart.store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CAT_ICON: Record<string, { Icon: typeof UtensilsCrossed; color: string }> = {
  RESTAURANT: { Icon: UtensilsCrossed, color: colors.primary },
  STORE:      { Icon: Store,           color: colors.secondary },
  CAFE:       { Icon: Coffee,          color: '#8B5CF6' },
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

  const { data: business, isLoading } = useQuery({
    queryKey: ['business', id],
    queryFn: () => businessesApi.getById(id!),
    enabled: !!id,
  });

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

  const catMeta = CAT_ICON[business.category] ?? CAT_ICON.RESTAURANT;
  const products = business.products || [];
  const categories = ['الكل', ...Array.from(new Set(products.map((p: any) => p.category).filter(Boolean) as string[]))];
  const filteredProducts = tab === 0 ? products : products.filter((p: any) => p.category === categories[tab]);

  const handleAdd = (p: Product) => {
    const result = addItem({ productId: p.id, name: p.name, price: p.price }, business.id, business.areaId);
    if (result === 'different_business') {
      if (Platform.OS === 'web') {
        if (window.confirm('سلتك تحتوي على منتجات من منشأة أخرى. هل تريد إفراغها والبدء بطلب جديد؟')) {
          clearCart();
          addItem({ productId: p.id, name: p.name, price: p.price }, business.id, business.areaId);
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
              addItem({ productId: p.id, name: p.name, price: p.price }, business.id, business.areaId);
            },
          },
        ],
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: cartQty > 0 ? 100 : spacing[8] }}
        showsVerticalScrollIndicator={false}
      >

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
            <Pressable style={styles.heroBtn} onPress={() => router.back()}>
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

        {/* ── Info block (overlapping) ── */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={styles.infoTitleWrap}>
              <Text style={styles.businessName}>{business.name}</Text>
              <Text style={styles.businessLocation}>{business.area?.city || 'فلسطين'} - {business.area?.name || ''}</Text>
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
        </View>

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
            filteredProducts.map((p: any) => (
              <View key={p.id} style={styles.productCard}>
                <View style={styles.productImageWrap}>
                  {p.imageUrl ? (
                    <Image source={{ uri: p.imageUrl }} style={styles.productImage} contentFit="cover" />
                  ) : (
                    <View style={[styles.productImage, styles.productImagePlaceholder]}>
                      <ChefHat size={24} color={colors.border} />
                    </View>
                  )}
                </View>

                <View style={styles.productInfo}>
                  <View>
                    <Text style={styles.productName}>{p.name}</Text>
                    <Text style={styles.productDesc} numberOfLines={2}>
                      {p.description || 'وصف شهي للمنتج'}
                    </Text>
                  </View>
                  
                  <View style={styles.productFooter}>
                    <Text style={styles.productPrice}>{p.price} ₪</Text>
                    {p.isAvailable && business.isOpen ? (() => {
                      const cartItem = cartItems.find((i) => i.productId === p.id);
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
              </View>
            ))
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCF3DC', // background-cream
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: '#FCF3DC',
    justifyContent: 'center',
    alignItems: 'center'
  },
  
  // Hero
  heroWrap: { 
    height: 256, // h-64
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
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  heroActionsRight: {
    flexDirection: 'row-reverse',
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
    marginTop: -40, // overlap
    padding: spacing[4],
    zIndex: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 6 },
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    }),
  },
  infoHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  infoTitleWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  businessName: { 
    fontSize: 26, // headline-lg-mobile
    fontFamily: fontFamily.bold, 
    color: colors.textPrimary,
    marginBottom: 4,
  },
  businessLocation: {
    fontSize: 15,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
  },
  addressRow: {
    flexDirection: 'row-reverse',
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
  ratingBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffdbc7', // primary-fixed
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  ratingText: {
    fontSize: 13, // label-md
    fontFamily: fontFamily.bold,
    color: '#4e2200', // on-primary-container
  },
  infoDetailsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing[5],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: 'rgba(229, 224, 213, 1)', // border-beige
    marginTop: spacing[3],
  },
  detailItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13, // label-md
    fontFamily: fontFamily.medium,
    color: '#564337', // on-surface-variant
  },

  // Tabs
  tabsContainer: {
    marginTop: spacing[4],
    backgroundColor: '#FCF3DC',
    paddingVertical: spacing[4],
  },
  tabsScrollContent: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    flexDirection: 'row-reverse',
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
    borderColor: 'rgba(229, 224, 213, 1)', // border-beige
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

  // Products
  productsContainer: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
    paddingBottom: spacing[4],
  },
  productCard: { 
    flexDirection: 'row-reverse', 
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
  productImageWrap: { 
    width: 80, 
    height: 80, 
    borderRadius: radius.lg, 
    overflow: 'hidden',
    backgroundColor: '#f5f2fc', // surface-container-low
    flexShrink: 0,
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
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: spacing[2],
  },
  productPrice: { 
    color: colors.primary, 
    fontFamily: fontFamily.bold, 
    fontSize: 17, // body-lg
  },
  addBtn: { 
    width: 32, 
    height: 32, 
    borderRadius: radius.md, 
    backgroundColor: 'rgba(230, 120, 30, 1)', // primary-container
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
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing[4],
    backgroundColor: 'transparent',
  },
  cartBar: { 
    height: 56, 
    borderRadius: radius.xl, 
    backgroundColor: 'rgba(230, 120, 30, 1)', // primary-container
    flexDirection: 'row-reverse',
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: spacing[6],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  cartBarLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing[2],
  },
  cartBarBadge: {
    backgroundColor: 'rgba(78, 34, 0, 0.2)', // on-primary-container/20
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cartBarBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: '#4e2200', // on-primary-container
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
    flexDirection: 'row-reverse',
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
});
