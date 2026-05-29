import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@shu/api-client';
import { colors, fontSizes, radius, spacing } from '../../src/theme';

export default function History() {
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
      // Driver earnings = business area delivery fee
      return acc + (o.business?.area?.deliveryFee ?? 5);
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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing[4], gap: spacing[3] }}>
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>إجمالي أرباح التوصيل هذا الشهر</Text>
        <Text style={styles.summaryValue}>₪{monthlyEarnings}</Text>
      </View>

      {completedOrders.map((o: any) => (
        <View key={o.id} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.business}>{o.business?.name || 'المنشأة التجارية'}</Text>
            <Text style={styles.amount}>+{o.business?.area?.deliveryFee ?? 5} ₪</Text>
          </View>
          <Text style={styles.muted}>{o.customer?.area?.city} - {o.customer?.area?.name || 'العنوان المسجل'}</Text>
          <View style={styles.row}>
            <Text style={styles.muted}>{formatDate(o.createdAt)}</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>تم التسليم</Text></View>
          </View>
        </View>
      ))}

      {completedOrders.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>لم تقم بتسليم أي طلبات بعد.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  summary: { backgroundColor: colors.secondary, borderRadius: radius.lg, padding: spacing[5], alignItems: 'center' },
  summaryLabel: { color: '#fff', opacity: 0.9, fontFamily: 'Cairo-Bold' },
  summaryValue: { color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 4, fontFamily: 'Cairo-Bold' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, gap: 4 },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  business: { fontSize: fontSizes.base, fontWeight: '700', color: colors.textPrimary, fontFamily: 'Cairo-Bold' },
  amount: { color: colors.primary, fontWeight: '700', fontSize: fontSizes.base },
  muted: { color: colors.textMuted, fontSize: fontSizes.sm, textAlign: 'right' },
  badge: { backgroundColor: '#DCFCE7', borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: 4 },
  badgeText: { color: '#166534', fontWeight: '700', fontSize: fontSizes.xs, fontFamily: 'Cairo-Bold' },
  emptyCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[8], borderWidth: 1, borderColor: colors.border, alignItems: 'center', marginTop: spacing[4] },
  emptyText: { color: colors.textMuted, fontSize: fontSizes.sm, fontFamily: 'Cairo-Bold' },
});
