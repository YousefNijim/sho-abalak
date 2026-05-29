import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';
import { ordersApi } from '@shu/api-client';
import type { Order } from '@shu/api-client';
import { useCartStore } from '../../src/stores/cart.store';

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  PENDING: { label: 'بانتظار التأكيد', bg: '#FEF3C7', fg: '#D97706' },
  CONFIRMED: { label: 'تم التأكيد', bg: '#DBEAFE', fg: '#2563EB' },
  PREPARING: { label: 'جاري التحضير', bg: '#FFEDD5', fg: '#C2410C' },
  READY: { label: 'جاهز للاستلام', bg: '#F3E8FF', fg: '#7C3AED' },
  PICKED_UP: { label: 'في الطريق', bg: '#CFFAFE', fg: '#0E7490' },
  DELIVERED: { label: 'تم التسليم', bg: '#DCFCE7', fg: '#166534' },
  CANCELLED: { label: 'ملغى', bg: '#FEE2E2', fg: '#991B1B' },
};

export default function Orders() {
  const router = useRouter();
  const [tab, setTab] = useState(0);

  const addItem = useCartStore((s) => s.addItem);
  const clearCart = useCartStore((s) => s.clear);

  // Fetch orders from API
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.list(),
  });

  const current = orders.filter((o: any) =>
    ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP'].includes(o.status),
  );
  const past = orders.filter((o: any) =>
    ['DELIVERED', 'CANCELLED'].includes(o.status),
  );
  const list = tab === 0 ? current : past;

  const handleReorder = (o: Order) => {
    clearCart();
    o.items?.forEach((it) => {
      addItem(
        {
          productId: it.productId,
          name: it.product?.name || 'منتج',
          price: it.unitPrice,
        },
        o.businessId,
        o.customer?.area?.name || '', // fallback
      );
    });
    router.push('/cart');
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ar-EG', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.tabs}>
        {['الحالية', 'السابقة'].map((t, i) => (
          <Pressable key={t} style={[styles.tab, tab === i && styles.tabActive]} onPress={() => setTab(i)}>
            <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[4] }}>
          {list.map((o: any) => {
            const s = STATUS[o.status] || { label: o.status, bg: colors.border, fg: colors.textPrimary };
            const itemsCount = o.items?.reduce((acc: number, it: any) => acc + Number(it.quantity), 0) ?? 0;
            return (
              <OrderCard key={o.id} o={o} s={s} itemsCount={itemsCount} handleReorder={handleReorder} router={router} formatDate={formatDate} />
            );
          })}
          {list.length === 0 ? <Text style={styles.empty}>لا توجد طلبات</Text> : null}
        </ScrollView>
      )}
    </View>
  );
}

function OrderCard({ o, s, itemsCount, handleReorder, router, formatDate }: any) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.card}>
      <Pressable onPress={() => setExpanded(!expanded)} style={{ gap: 4 }}>
        <View style={styles.row}>
          <Text style={styles.business}>{o.business?.name || 'منشأة شو عبالك'}</Text>
          <View style={[styles.badge, { backgroundColor: s.bg }]}>
            <Text style={[styles.badgeText, { color: s.fg }]}>{s.label}</Text>
          </View>
        </View>
        <Text style={styles.muted}>{formatDate(o.createdAt)}</Text>
        <Text style={styles.muted}>{itemsCount} عناصر · {o.total} ₪</Text>
      </Pressable>

      {expanded && (
        <View style={styles.expandedContent}>
          <Text style={styles.sectionTitle}>المنتجات:</Text>
          {o.items?.map((it: any) => (
            <View key={it.id} style={styles.itemRow}>
              <Text style={styles.itemText}>{it.quantity}x {it.product?.name}</Text>
              <Text style={styles.itemText}>{it.unitPrice} ₪</Text>
            </View>
          ))}
          <View style={styles.itemRow}>
            <Text style={[styles.itemText, { fontFamily: fontFamily.bold }]}>رسوم التوصيل</Text>
            <Text style={[styles.itemText, { fontFamily: fontFamily.bold }]}>
              {o.total - (o.items?.reduce((acc: number, it: any) => acc + it.quantity * it.unitPrice, 0) || 0)} ₪
            </Text>
          </View>
          
          {o.driver && o.status === 'DELIVERED' && (
            <Text style={styles.driverInfo}>تم التوصيل بواسطة: {o.driver?.user?.name}</Text>
          )}

          <View style={styles.actions}>
            <Pressable style={styles.secondaryBtn} onPress={() => handleReorder(o)}>
              <Text style={styles.secondaryText}>أعد الطلب</Text>
            </Pressable>
            <Pressable style={styles.detailsBtn} onPress={() => router.push({ pathname: '/tracking', params: { id: o.id } })}>
              <Text style={styles.detailsText}>التتبع والتفاصيل</Text>
            </Pressable>
          </View>
        </View>
      )}
      {!expanded && (
        <View style={styles.actions}>
          <Pressable style={styles.secondaryBtn} onPress={() => handleReorder(o)}>
            <Text style={styles.secondaryText}>أعد الطلب</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', padding: spacing[4], gap: spacing[2] },
  tab: { flex: 1, paddingVertical: spacing[3], borderRadius: radius.md, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textMuted, fontFamily: fontFamily.semibold },
  tabTextActive: { color: '#fff' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2, gap: 4 },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  business: { fontSize: fontSizes.lg, fontFamily: fontFamily.bold, color: colors.textPrimary, textAlign: 'right' },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.full },
  badgeText: { fontSize: fontSizes.xs, fontFamily: fontFamily.bold },
  muted: { color: colors.textMuted, fontSize: fontSizes.sm, textAlign: 'right', fontFamily: fontFamily.regular },
  actions: { flexDirection: 'row-reverse', gap: spacing[3], marginTop: spacing[3] },
  secondaryBtn: { flex: 1, height: 44, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.primary, fontFamily: fontFamily.bold },
  detailsBtn: { flex: 1, height: 44, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  detailsText: { color: '#fff', fontFamily: fontFamily.bold },
  empty: { textAlign: 'center', color: colors.textMuted, fontFamily: fontFamily.regular, marginTop: spacing[12] },
  expandedContent: { marginTop: spacing[2], borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing[3] },
  sectionTitle: { fontFamily: fontFamily.bold, color: colors.textPrimary, marginBottom: spacing[2], textAlign: 'right' },
  itemRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 4 },
  itemText: { color: colors.textMuted, fontSize: fontSizes.sm, fontFamily: fontFamily.regular },
  driverInfo: { marginTop: spacing[2], color: colors.primary, fontSize: fontSizes.sm, fontFamily: fontFamily.semibold, textAlign: 'right' },
});
