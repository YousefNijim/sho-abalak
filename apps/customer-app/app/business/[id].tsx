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
} from 'lucide-react-native';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';
import { businessesApi } from '@shu/api-client';
import type { Product } from '@shu/api-client';
import { useCartStore } from '../../src/stores/cart.store';

const CAT_ICON: Record<string, { Icon: typeof UtensilsCrossed; color: string }> = {
  RESTAURANT: { Icon: UtensilsCrossed, color: colors.primary },
  STORE:      { Icon: Store,           color: colors.secondary },
  CAFE:       { Icon: Coffee,          color: '#8B5CF6' },
};

export default function BusinessDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const addItem    = useCartStore((s) => s.addItem);
  const clearCart  = useCartStore((s) => s.clear);
  const cartItems  = useCartStore((s) => s.items);
  const cartQty    = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const [tab, setTab] = useState(0);

  const { data: business, isLoading } = useQuery({
    queryKey: ['business', id],
    queryFn: () => businessesApi.getById(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!business) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: cartQty > 0 ? 100 : 24 }}>

        {/* ── Hero image ── */}
        <View style={styles.heroWrap}>
          {business.imageUrl ? (
            <Image source={{ uri: business.imageUrl }} style={styles.heroImg} contentFit="cover" />
          ) : (
            <View style={[styles.heroImg, styles.heroPlaceholder]}>
              <View style={styles.heroIcon}>
                <catMeta.Icon size={48} color={catMeta.color} />
              </View>
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.55)']}
            style={styles.heroGradient}
            pointerEvents="none"
          />
        </View>

        {/* ── Info block ── */}
        <View style={styles.info}>
          <View style={styles.infoRow}>
            <Text style={styles.name}>{business.name}</Text>
            <View style={[styles.statusPill, { backgroundColor: business.isOpen ? colors.secondary : '#374151' }]}>
              <Text style={styles.statusText}>{business.isOpen ? 'مفتوح' : 'مغلق'}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Star size={14} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.metaText}>{business.rating ? business.rating.toFixed(1) : '5.0'}</Text>
            </View>
            <View style={styles.metaDot} />
            <View style={styles.metaItem}>
              <Clock size={14} color={colors.textMuted} />
              <Text style={styles.metaText}>٣٠ دقيقة</Text>
            </View>
            <View style={styles.metaDot} />
            <View style={styles.metaItem}>
              <MapPin size={14} color={colors.textMuted} />
              <Text style={styles.metaText}>{business.area?.city}، {business.area?.name}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Bike size={14} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.primary }]}>
                رسوم التوصيل: {business.area?.deliveryFee ?? 0} ₪
              </Text>
            </View>
          </View>
        </View>

        {/* ── Category tabs ── */}
        {categories.length > 1 && (
          <View style={styles.tabs}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[5] }}>
              {categories.map((t, i) => (
                <Pressable key={t} onPress={() => setTab(i)} style={styles.tabBtn}>
                  <Text style={[styles.tabText, tab === i && styles.tabActive]}>{t}</Text>
                  {tab === i && <View style={styles.tabUnderline} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Products ── */}
        <View style={{ paddingHorizontal: spacing[4], gap: spacing[3], marginTop: spacing[2] }}>
          {filteredProducts.length === 0 ? (
            <Text style={styles.empty}>لا توجد منتجات متوفرة حالياً</Text>
          ) : (
            filteredProducts.map((p: any) => (
              <View key={p.id} style={styles.product}>
                {/* Product image */}
                <View style={styles.productImgWrap}>
                  {p.imageUrl ? (
                    <Image source={{ uri: p.imageUrl }} style={styles.productImg} contentFit="cover" />
                  ) : (
                    <View style={[styles.productImg, styles.productImgPlaceholder]}>
                      <ChefHat size={24} color={colors.border} />
                    </View>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{p.name}</Text>
                  <Text style={styles.muted} numberOfLines={2}>
                    {p.description || 'وصف شهي للمنتج'}
                  </Text>
                  <Text style={styles.price}>{p.price} ₪</Text>
                </View>

                {p.isAvailable && business.isOpen ? (
                  <Pressable style={styles.addBtn} onPress={() => handleAdd(p)}>
                    <Plus size={20} color="#fff" strokeWidth={2.5} />
                  </Pressable>
                ) : (
                  <View style={styles.unavailable}>
                    <Text style={styles.unavailableText}>غير متوفر</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* ── Cart bar ── */}
      {cartQty > 0 && (
        <Pressable style={styles.cartBar} onPress={() => router.push('/cart')}>
          <Text style={styles.cartBarText}>
            {cartQty} عناصر — عرض السلة ({useCartStore.getState().total()} ₪)
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Hero
  heroWrap:        { height: 220, position: 'relative' },
  heroImg:         { width: '100%', height: 220 },
  heroPlaceholder: { backgroundColor: colors.border + '50', alignItems: 'center', justifyContent: 'center' },
  heroIcon:        { width: 88, height: 88, borderRadius: radius.xl, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  heroGradient:    { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },

  // Info
  info:       { padding: spacing[4], gap: spacing[3], backgroundColor: colors.surface, marginHorizontal: spacing[4], borderRadius: radius.lg, marginTop: -spacing[6], shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  infoRow:    { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  name:       { fontSize: fontSizes['2xl'], fontFamily: fontFamily.bold, color: colors.textPrimary, flex: 1, textAlign: 'right', marginLeft: spacing[3] },
  statusPill: { paddingHorizontal: spacing[3], paddingVertical: 4, borderRadius: radius.full },
  statusText: { color: '#fff', fontSize: fontSizes.xs, fontFamily: fontFamily.semibold },
  metaRow:    { flexDirection: 'row-reverse', alignItems: 'center', flexWrap: 'wrap', gap: spacing[2] },
  metaItem:   { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  metaText:   { fontSize: fontSizes.sm, color: colors.textMuted, fontFamily: fontFamily.regular },
  metaDot:    { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.border },

  // Tabs
  tabs:         { flexDirection: 'row', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border, marginTop: spacing[4], marginBottom: spacing[2] },
  tabBtn:       { alignItems: 'center', gap: 4 },
  tabText:      { color: colors.textMuted, fontSize: fontSizes.base, fontFamily: fontFamily.semibold },
  tabActive:    { color: colors.primary },
  tabUnderline: { height: 2, backgroundColor: colors.primary, borderRadius: 1, width: '100%' },

  // Products
  product:             { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing[3], backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[3], shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  productImgWrap:      { borderRadius: radius.md, overflow: 'hidden' },
  productImg:          { width: 72, height: 72, borderRadius: radius.md },
  productImgPlaceholder: { backgroundColor: colors.border + '40', alignItems: 'center', justifyContent: 'center' },
  productName:         { fontSize: fontSizes.base, fontFamily: fontFamily.bold, color: colors.textPrimary, textAlign: 'right' },
  muted:               { color: colors.textMuted, fontSize: fontSizes.sm, textAlign: 'right' },
  price:               { color: colors.primary, fontFamily: fontFamily.bold, marginTop: 4, textAlign: 'right' },
  addBtn:              { width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  unavailable:         { paddingHorizontal: spacing[2], paddingVertical: 4, borderRadius: radius.sm, backgroundColor: colors.border },
  unavailableText:     { color: colors.textMuted, fontSize: fontSizes.xs, fontFamily: fontFamily.semibold },

  // Cart bar
  cartBar:     { position: 'absolute', bottom: 24, left: spacing[4], right: spacing[4], height: 52, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 10, elevation: 4 },
  cartBarText: { color: '#fff', fontFamily: fontFamily.bold, fontSize: fontSizes.base },
  empty:       { textAlign: 'center', color: colors.textMuted, marginTop: spacing[6], fontFamily: fontFamily.regular },
});
