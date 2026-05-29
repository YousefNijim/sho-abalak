'use client';

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, fontSizes, radius, spacing } from '../../src/theme';
import { businessesApi } from '@shu/api-client';
import type { Product } from '@shu/api-client';
import { useCartStore } from '../../src/stores/cart.store';

export default function BusinessDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const clearCart = useCartStore((s) => s.clear);
  const cartItems = useCartStore((s) => s.items);
  const cartQty = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const [tab, setTab] = useState(0);

  // Fetch business with products included
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

  const emoji = business.category === 'RESTAURANT' ? '🍕' : business.category === 'CAFE' ? '☕' : '🏢';
  const products = business.products || [];

  // Generate dynamic tabs based on product categories
  const categories = ['الكل', ...Array.from(new Set(products.map((p: any) => p.category).filter(Boolean) as string[]))];

  // Filter products based on selected tab
  const filteredProducts =
    tab === 0
      ? products
      : products.filter((p: any) => p.category === categories[tab]);

  const handleAdd = (p: Product) => {
    const result = addItem(
      {
        productId: p.id,
        name: p.name,
        price: p.price,
      },
      business.id,
      business.areaId,
    );

    if (result === 'different_business') {
      Alert.alert(
        'تنبيه السلة',
        'سلتك تحتوي على منتجات من منشأة أخرى. هل تريد إفراغ السلة والبدء بطلب جديد؟',
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'إفراغ والبدء من جديد',
            style: 'destructive',
            onPress: () => {
              clearCart();
              addItem(
                {
                  productId: p.id,
                  name: p.name,
                  price: p.price,
                },
                business.id,
                business.areaId,
              );
            },
          },
        ],
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: cartQty > 0 ? 100 : 24 }}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={{ fontSize: 80 }}>{emoji}</Text>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name}>{business.name}</Text>
          <Text style={styles.metaLine}>⭐ {business.rating ? business.rating.toFixed(1) : '5.0'}  ·  🕐 30 دقيقة</Text>
          <Text style={styles.metaLine}>📍 {business.area?.city}، {business.area?.name}  ·  🛵 رسوم توصيل: {business.area?.deliveryFee ?? 0} ₪</Text>
        </View>

        {/* Tabs */}
        {categories.length > 1 && (
          <View style={styles.tabs}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[6] }}>
              {categories.map((t, i) => (
                <Pressable key={t} onPress={() => setTab(i)}>
                  <Text style={[styles.tabText, tab === i && styles.tabActive]}>{t}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Products */}
        <View style={{ paddingHorizontal: spacing[4], gap: spacing[3], marginTop: spacing[2] }}>
          {filteredProducts.length === 0 ? (
            <Text style={styles.empty}>لا توجد منتجات متوفرة حالياً</Text>
          ) : (
            filteredProducts.map((p: any) => (
              <View key={p.id} style={styles.product}>
                <View style={styles.productImg}>
                  <Text style={{ fontSize: 32 }}>🍽️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{p.name}</Text>
                  <Text style={styles.muted} numberOfLines={2}>{p.description || 'وصف شهي للمنتج...'}</Text>
                  <Text style={styles.price}>{p.price} ₪</Text>
                </View>
                {p.isAvailable && business.isOpen ? (
                  <Pressable style={styles.add} onPress={() => handleAdd(p)}>
                    <Text style={styles.addText}>+</Text>
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

      {/* Cart bar */}
      {cartQty > 0 ? (
        <Pressable style={styles.cartBar} onPress={() => router.push('/cart')}>
          <Text style={styles.cartBarText}>{cartQty} عناصر — عرض السلة ({useCartStore.getState().total()} ₪)</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 200, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  info: { padding: spacing[4], gap: 6 },
  name: { fontSize: fontSizes['2xl'], fontWeight: '700', color: colors.textPrimary },
  metaLine: { color: colors.textMuted, fontSize: fontSizes.sm },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: spacing[3] },
  tabText: { color: colors.textMuted, fontSize: fontSizes.base, fontWeight: '600' },
  tabActive: { color: colors.primary, borderBottomWidth: 2, borderBottomColor: colors.primary, paddingBottom: 4 },
  product: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[3], borderWidth: 1, borderColor: colors.border },
  productImg: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  productName: { fontSize: fontSizes.base, fontWeight: '700', color: colors.textPrimary },
  muted: { color: colors.textMuted, fontSize: fontSizes.sm },
  price: { color: colors.primary, fontWeight: '700', marginTop: 4 },
  add: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  addText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 24 },
  unavailable: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm, backgroundColor: colors.border },
  unavailableText: { color: colors.textMuted, fontSize: fontSizes.xs, fontWeight: '600' },
  cartBar: { position: 'absolute', bottom: 24, left: 16, right: 16, height: 52, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  cartBarText: { color: '#fff', fontWeight: '700', fontSize: fontSizes.base },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing[6] },
});
