import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  Heart,
  Plus,
  Minus,
  ShoppingCart,
  Star,
  ChefHat
} from 'lucide-react-native';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';
import { businessesApi, BASE_URL } from '@shu/api-client';
import { useFoodCartStore } from '../../src/stores/foodCart.store';
import { useStoreCartStore } from '../../src/stores/storeCart.store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const mediaUrl = (path: string | null | undefined): string | null =>
  !path ? null : path.startsWith('http') ? path : `${BASE_URL}${path}`;

export default function ProductDetail() {
  const { id, businessId } = useLocalSearchParams<{ id: string; businessId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const foodAddItem = useFoodCartStore((s) => s.addItem);
  const foodClearCart = useFoodCartStore((s) => s.clear);
  const storeAddItem = useStoreCartStore((s) => s.addItem);
  const storeClearCart = useStoreCartStore((s) => s.clear);

  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  const { data: business, isLoading } = useQuery({
    queryKey: ['business', businessId],
    queryFn: () => businessesApi.getById(businessId!),
    enabled: !!businessId,
  });

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const product = business?.products?.find((p) => p.id === id);

  if (!business || !product) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={{ color: colors.textMuted }}>المنتج غير موجود</Text>
      </View>
    );
  }

  const isStore = business?.type === 'STORE';
  const addItem = isStore ? storeAddItem : foodAddItem;
  const clearCart = isStore ? storeClearCart : foodClearCart;

  const handleAdd = () => {
    // Note: The cart store currently only takes productId, name, price, businessId, areaId.
    // We are adding multiple items by calling it multiple times or modifying state?
    // Wait, addItem adds 1 quantity and checks different business.
    // Let's implement a loop to add the correct quantity, or update the cart directly.
    const result = addItem({ productId: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl }, business.id, business.areaId);
    
    const finalizeAdd = () => {
      // Since addItem adds 1 piece, we need to increment the quantity by (quantity - 1)
      const cartState = isStore ? useStoreCartStore.getState() : useFoodCartStore.getState();
      if (quantity > 1) {
        cartState.updateQty(product.id, quantity - 1);
      }
      // Currently the cart doesn't store notes per item natively in standard schema, but we can just pop back for now.
      router.back();
    };

    if (result === 'different_business') {
      if (Platform.OS === 'web') {
        if (window.confirm('سلتك تحتوي على منتجات من منشأة أخرى. هل تريد إفراغها والبدء بطلب جديد؟')) {
          clearCart();
          addItem({ productId: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl }, business.id, business.areaId);
          finalizeAdd();
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
              addItem({ productId: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl }, business.id, business.areaId);
              finalizeAdd();
            },
          },
        ],
      );
    } else {
      finalizeAdd();
    }
  };

  const updateQty = (val: number) => {
    setQuantity((prev) => Math.max(1, prev + val));
  };

  const totalPrice = product.price * quantity;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Top AppBar */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()}>
          <ArrowRight size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{product.name}</Text>
        <Pressable style={styles.iconBtn} onPress={() => setIsFavorite(!isFavorite)}>
          <Heart size={24} color={isFavorite ? colors.error : colors.primary} fill={isFavorite ? colors.error : 'transparent'} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroWrap}>
          {product.imageUrl ? (
            <Image source={{ uri: mediaUrl(product.imageUrl)! }} style={styles.heroImg} contentFit="cover" />
          ) : (
            <View style={[styles.heroImg, styles.heroPlaceholder]}>
              <ChefHat size={64} color={colors.primary} opacity={0.3} />
            </View>
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.2)', 'transparent', 'transparent']}
            style={styles.heroGradient}
            pointerEvents="none"
          />
        </View>

        {/* Content Area */}
        <View style={styles.infoCard}>
          {/* Product Header */}
          <View style={styles.productHeaderRow}>
            <View style={styles.productHeaderTitleWrap}>
              <Text style={styles.productName}>{product.name}</Text>
              <View style={styles.productTagsRow}>
                <View style={styles.ratingBadge}>
                  <Star size={16} color={colors.secondary} fill={colors.secondary} />
                  <Text style={styles.ratingText}>4.8</Text>
                </View>
                {product.isAvailable ? (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>متوفر</Text>
                  </View>
                ) : (
                  <View style={[styles.popularBadge, { backgroundColor: colors.border, borderColor: colors.border }]}>
                    <Text style={[styles.popularBadgeText, { color: colors.textMuted }]}>غير متوفر</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.priceCol}>
              <Text style={styles.priceValue}>{product.price}</Text>
              <Text style={styles.priceCurrency}>₪</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الوصف</Text>
            <Text style={styles.descriptionText}>
              {product.description || 'وصف شهي للمنتج'}
            </Text>
          </View>

          {/* Special Instructions */}
          <View style={styles.section}>
            <View style={styles.instructionsWrap}>
              <Text style={styles.instructionsTitle}>تعليمات خاصة</Text>
              <TextInput
                style={styles.instructionsInput}
                multiline
                placeholder="مثلاً: بدون بصل، صوص زيادة..."
                placeholderTextColor={colors.textMuted}
                value={notes}
                onChangeText={setNotes}
                textAlignVertical="top"
                textAlign="right"
              />
            </View>
          </View>

          {/* Quantity Selector */}
          <View style={styles.quantityRow}>
            <Text style={styles.sectionTitle}>الكمية</Text>
            <View style={styles.stepperWrap}>
              <Pressable style={styles.stepperBtn} onPress={() => updateQty(-1)}>
                <Minus size={20} color={colors.primary} />
              </Pressable>
              <Text style={styles.stepperQty}>{quantity}</Text>
              <Pressable style={[styles.stepperBtn, styles.stepperBtnPlus]} onPress={() => updateQty(1)}>
                <Plus size={20} color="#fff" />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing[3]) + spacing[2] }]}>
        <View style={styles.footerContent}>
          <View style={styles.totalWrap}>
            <Text style={styles.totalLabel}>المجموع الكلي</Text>
            <Text style={styles.totalValue}>{totalPrice} ₪</Text>
          </View>
          <Pressable 
            style={[styles.addBtn, !product.isAvailable && { opacity: 0.5 }]} 
            onPress={handleAdd}
            disabled={!product.isAvailable}
          >
            <ShoppingCart size={24} color="#fff" />
            <Text style={styles.addBtnText}>إضافة للسلة</Text>
            <Text style={styles.addBtnTotalMobile}>• {totalPrice} ₪</Text>
          </Pressable>
        </View>
      </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FCF3DC',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    backgroundColor: 'rgba(252, 243, 220, 0.55)', // faint cream tint — legible but doesn't hide the image
    zIndex: 50,
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    color: colors.primary,
    flex: 1,
    textAlign: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  heroWrap: {
    width: '100%',
    height: 397,
    position: 'relative',
  },
  heroImg: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    backgroundColor: 'rgba(151, 72, 0, 0.1)',
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
  infoCard: {
    backgroundColor: '#FFFFFF',
    marginTop: -40,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[8],
    paddingBottom: spacing[12],
    minHeight: 442,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10 },
      android: { elevation: 6 },
    }),
  },
  productHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
  },
  productHeaderTitleWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  productName: {
    fontFamily: fontFamily.bold,
    fontSize: 26,
    color: colors.textPrimary,
    marginBottom: spacing[2],
    textAlign: 'right',
  },
  productTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(41, 106, 67, 0.1)', // secondary/10
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  ratingText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.secondary,
  },
  popularBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)', // success-green/10
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  popularBadgeText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.success,
  },
  priceCol: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginLeft: spacing[4],
  },
  priceValue: {
    fontFamily: fontFamily.bold,
    fontSize: 26,
    color: colors.primary,
  },
  priceCurrency: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.primary,
    marginRight: 2,
    marginBottom: 4,
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing[2],
    textAlign: 'right',
  },
  descriptionText: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 24,
    textAlign: 'right',
  },
  instructionsWrap: {
    backgroundColor: 'rgba(252, 243, 220, 0.3)', // background-cream/30
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing[4],
  },
  instructionsTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: spacing[3],
    textAlign: 'right',
  },
  instructionsInput: {
    height: 96,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing[3],
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.textPrimary,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[6],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[5],
    backgroundColor: '#FCF3DC',
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 2 },
    }),
  },
  stepperBtnPlus: {
    backgroundColor: colors.primary,
  },
  stepperQty: {
    fontFamily: fontFamily.semibold,
    fontSize: 20,
    color: colors.textPrimary,
    minWidth: 32,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[5],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    zIndex: 50,
  },
  footerContent: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[5],
  },
  totalWrap: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    display: Platform.OS === 'web' ? 'flex' : 'none', // hide on small mobile screens if needed, wait we will just show it
  },
  totalLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
  totalValue: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    color: colors.primary,
  },
  addBtn: {
    flex: 1,
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  addBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  addBtnTotalMobile: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
