'use client';

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@shu/ui-components/native';
import { colors, fontSizes, radius, spacing } from '../src/theme';
import { useCartStore } from '../src/stores/cart.store';
import { businessesApi, ordersApi } from '@shu/api-client';
import type { CreateOrderDto } from '@shu/api-client';

export default function Cart() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const items = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQty);
  const businessId = useCartStore((s) => s.businessId);
  const areaId = useCartStore((s) => s.areaId);
  const clearCart = useCartStore((s) => s.clear);
  const subtotal = useCartStore((s) => s.total());

  const [payment, setPayment] = useState<'CASH' | 'ELECTRONIC'>('CASH');

  // Fetch business details to get the delivery fee
  const { data: business, isLoading: loadingBusiness } = useQuery({
    queryKey: ['business', businessId],
    queryFn: () => businessesApi.getById(businessId!),
    enabled: !!businessId,
  });

  const fee = business?.area?.deliveryFee ?? 0;
  const total = subtotal + fee;

  // Mutation to create order
  const createOrder = useMutation({
    mutationFn: (dto: CreateOrderDto) => ordersApi.create(dto),
    onSuccess: (data: any) => {
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      // Navigate to tracking screen with order ID
      router.replace({
        pathname: '/tracking',
        params: { id: data.id },
      });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'فشل إرسال الطلب. يرجى المحاولة لاحقاً.';
      Alert.alert('خطأ في إرسال الطلب', msg);
    },
  });

  const handleConfirm = () => {
    if (!businessId || !areaId) return;

    createOrder.mutate({
      businessId,
      areaId,
      paymentMethod: payment,
      items: items.map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
      })),
    });
  };

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing[6] }}>
        <Text style={{ fontSize: 64, marginBottom: spacing[4] }}>🛒</Text>
        <Text style={{ fontSize: fontSizes.xl, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing[2] }}>سلتك فارغة</Text>
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginBottom: spacing[6] }}>تصفح الأقسام وأضف بعض المنتجات الشهية والمنوعة لسلتك!</Text>
        <Button title="ابدأ التسوق" onPress={() => router.replace('/(tabs)')} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing[4], paddingBottom: 120, gap: spacing[3] }}>
        <Text style={styles.businessHeader}>طلبك من {business?.name || 'المنشأة'}</Text>

        {items.map((it) => (
          <View key={it.productId} style={styles.item}>
            <View style={styles.img}><Text style={{ fontSize: 28 }}>🍽️</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{it.name}</Text>
              <Text style={styles.price}>{it.price} ₪</Text>
            </View>
            <View style={styles.qtyRow}>
              <Pressable style={styles.qtyBtn} onPress={() => updateQty(it.productId, -1)}><Text style={styles.qtySign}>−</Text></Pressable>
              <Text style={styles.qty}>{it.quantity}</Text>
              <Pressable style={styles.qtyBtn} onPress={() => updateQty(it.productId, 1)}><Text style={styles.qtySign}>+</Text></Pressable>
            </View>
          </View>
        ))}

        {/* Summary */}
        {loadingBusiness ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
        ) : (
          <View style={styles.summary}>
            <Row label="المجموع الفرعي" value={`${subtotal} ₪`} />
            <Row label="رسوم التوصيل" value={`${fee} ₪`} />
            <View style={styles.divider} />
            <Row label="الإجمالي" value={`${total} ₪`} bold />
          </View>
        )}

        {/* Payment */}
        <Text style={styles.sectionTitle}>طريقة الدفع</Text>
        <Pressable style={styles.payOption} onPress={() => setPayment('CASH')}>
          <View style={[styles.radio, payment === 'CASH' && styles.radioOn]} />
          <Text style={styles.payText}>نقدي عند الاستلام</Text>
        </Pressable>
        <Pressable style={styles.payOption} onPress={() => setPayment('ELECTRONIC')}>
          <View style={[styles.radio, payment === 'ELECTRONIC' && styles.radioOn]} />
          <Text style={styles.payText}>دفع إلكتروني</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={createOrder.isPending ? 'جاري إرسال الطلب...' : 'تأكيد الطلب'}
          onPress={handleConfirm}
          disabled={createOrder.isPending}
        />
      </View>
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  businessHeader: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.primary, marginBottom: spacing[2], textAlign: 'right' },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[3], borderWidth: 1, borderColor: colors.border },
  img: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: fontSizes.base, fontWeight: '700', color: colors.textPrimary },
  price: { color: colors.primary, fontWeight: '700', marginTop: 2 },
  qtyRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing[3] },
  qtyBtn: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  qtySign: { fontSize: 18, fontWeight: '700', color: colors.primary },
  qty: { fontSize: fontSizes.base, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  summary: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, gap: spacing[2], marginTop: spacing[2] },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: colors.textMuted, fontSize: fontSizes.base },
  rowValue: { color: colors.textPrimary, fontSize: fontSizes.base },
  bold: { fontWeight: '700', color: colors.textPrimary, fontSize: fontSizes.lg },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing[1] },
  sectionTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.textPrimary, marginTop: spacing[2] },
  payOption: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing[4], borderWidth: 1, borderColor: colors.border },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border },
  radioOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  payText: { fontSize: fontSizes.base, color: colors.textPrimary },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing[4], backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
