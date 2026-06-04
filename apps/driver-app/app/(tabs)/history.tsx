import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ordersApi } from '@shu/api-client';
import { formatShekel } from '@shu/utils';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';

/** Driver's earning for an order = their share of the delivery fee.
 *  Prefers the order snapshot, falls back to area config, then full fee for legacy orders. */
function driverFeeFor(o: any): number {
  if (o?.driverDeliveryFee != null && Number(o.driverDeliveryFee) > 0) return Number(o.driverDeliveryFee);
  if (o?.business?.area?.driverDeliveryFee != null && Number(o.business.area.driverDeliveryFee) > 0)
    return Number(o.business.area.driverDeliveryFee);
  return Number(o?.business?.area?.deliveryFee ?? 5);
}

export default function History() {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // Query historical orders scoped to this driver
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['driver-orders-history'],
    queryFn: () => ordersApi.list(),
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Filter in-memory for DELIVERED status
  const completedOrders = orders.filter((o: any) => o.status === 'DELIVERED');

  // Compute monthly earnings sum (using delivery fee portion)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyEarnings = completedOrders
    .filter((o: any) => {
      try {
        const d = new Date(o.createdAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      } catch {
        return false;
      }
    })
    .reduce((acc: number, o: any) => {
      // Driver earns only their share of the delivery fee (snapshotted on the order).
      // Fall back to the area's driver fee, then the full delivery fee for legacy orders.
      return acc + driverFeeFor(o);
    }, 0);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ar-EG', {
        day: '2-digit',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['driver-orders-history'] });
    setRefreshing(false);
  };

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: colors.background }} 
      contentContainerStyle={{ padding: spacing[4], gap: spacing[3], paddingBottom: insets.bottom + spacing[4] }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />
      }
    >
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>إجمالي أرباح التوصيل هذا الشهر</Text>
        <Text style={styles.summaryValue}>{formatShekel(monthlyEarnings)}</Text>
      </View>

      {completedOrders.map((o: any) => (
        <DriverOrderCard key={o.id} o={o} formatDate={formatDate} />
      ))}

      {completedOrders.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>لم تقم بتسليم أي طلبات بعد.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function DriverOrderCard({ o, formatDate }: any) {
  const [expanded, setExpanded] = useState(false);
  const itemsCount = o.items?.reduce((acc: number, it: any) => acc + Number(it.quantity), 0) ?? 0;

  return (
    <Pressable style={styles.card} onPress={() => setExpanded(!expanded)}>
      <View style={styles.row}>
        <Text style={styles.business}>{o.business?.name || 'المنشأة التجارية'}</Text>
        <Text style={styles.amount}>+{formatShekel(driverFeeFor(o))}</Text>
      </View>
      <Text style={styles.muted}>{o.customer?.area?.city} - {o.customer?.area?.name || 'العنوان المسجل'}</Text>
      <View style={styles.row}>
        <Text style={styles.muted}>{formatDate(o.createdAt)}</Text>
        <View style={styles.badge}><Text style={styles.badgeText}>تم التسليم</Text></View>
      </View>
      
      {expanded && (
        <View style={styles.expandedContent}>
          <Text style={styles.sectionTitle}>تفاصيل إضافية:</Text>
          <Text style={styles.detailText}>رقم الطلب: #{o.id.slice(-6).toUpperCase()}</Text>
          <Text style={styles.detailText}>العميل: {o.customer?.name} ({o.customer?.phone})</Text>
          <Text style={styles.detailText}>دفع العميل: {o.total} ₪ ({o.paymentMethod === 'CASH' ? 'نقدي' : 'إلكتروني'})</Text>
          
          <Text style={[styles.sectionTitle, { marginTop: spacing[3] }]}>العناصر ({itemsCount}):</Text>
          {o.items?.map((it: any) => (
            <Text key={it.id} style={styles.detailText}>
              - {it.product?.name} (x{it.quantity})
            </Text>
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  summary: { backgroundColor: colors.secondary, borderRadius: radius.lg, padding: spacing[5], alignItems: 'center' },
  summaryLabel: { color: '#fff', opacity: 0.9 },
  summaryValue: { color: '#fff', fontSize: 32, fontFamily: fontFamily.extrabold, marginTop: 4 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  business: { fontSize: fontSizes.base, fontFamily: fontFamily.bold, color: colors.textPrimary },
  amount: { color: colors.primary, fontFamily: fontFamily.bold, fontSize: fontSizes.base },
  muted: { color: colors.textMuted, fontSize: fontSizes.sm, textAlign: 'right' },
  badge: { backgroundColor: '#DCFCE7', borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: 4 },
  badgeText: { color: '#166534', fontFamily: fontFamily.bold, fontSize: fontSizes.xs },
  emptyCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[8], borderWidth: 1, borderColor: colors.border, alignItems: 'center', marginTop: spacing[4] },
  emptyText: { color: colors.textMuted, fontSize: fontSizes.sm },
  expandedContent: { marginTop: spacing[3], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.border },
  sectionTitle: { fontFamily: fontFamily.bold, color: colors.textPrimary, marginBottom: spacing[2], textAlign: 'right' },
  detailText: { color: colors.textMuted, fontSize: fontSizes.sm, fontFamily: fontFamily.regular, textAlign: 'right', marginBottom: 2 },
});
