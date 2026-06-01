import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';
import { businessesApi, ordersApi } from '@shu/api-client';

const PERIODS = ['اليوم', 'الأسبوع', 'الشهر'];

export default function Analytics() {
  const [period, setPeriod] = useState(0);

  // Fetch business profile
  const { data: business } = useQuery({
    queryKey: ['business-mine'],
    queryFn: () => businessesApi.mine(),
  });

  // Fetch all orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['business-orders'],
    queryFn: () => ordersApi.list(),
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Filter orders by selected period
  const filterOrdersByPeriod = (arr: any[], periodIdx: number) => {
    const now = new Date();
    return arr.filter((o: any) => {
      try {
        const d = new Date(o.createdAt);
        if (periodIdx === 0) { // Today
          return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        } else if (periodIdx === 1) { // This Week (last 7 days)
          const diff = now.getTime() - d.getTime();
          return diff <= 7 * 24 * 60 * 60 * 1000;
        } else { // This Month (last 30 days)
          const diff = now.getTime() - d.getTime();
          return diff <= 30 * 24 * 60 * 60 * 1000;
        }
      } catch {
        return false;
      }
    });
  };

  const periodOrders = filterOrdersByPeriod(orders, period);
  const completedOrders = periodOrders.filter((o: any) => o.status === 'DELIVERED');

  const totalSales = Math.round(completedOrders.reduce((acc: number, o: any) => acc + Number(o.total || 0), 0) * 100) / 100;
  const avgOrder = completedOrders.length > 0 ? Math.round((totalSales / completedOrders.length) * 100) / 100 : 0;

  // Compile top selling products
  const compileTopProducts = (arr: any[]) => {
    const counts: Record<string, number> = {};
    arr.forEach((o: any) => {
      if (o.status === 'DELIVERED') {
        o.items?.forEach((it: any) => {
          const name = it.product?.name || 'منتج';
          counts[name] = (counts[name] || 0) + Number(it.quantity || 0);
        });
      }
    });
    return Object.keys(counts)
      .map((name) => ({ name, count: counts[name] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  };

  const topProducts = compileTopProducts(periodOrders);

  // Compile chart data bucketed by day (period-aware)
  const compileChart = (arr: any[], periodIdx: number) => {
    if (periodIdx === 0) {
      // Today: bucket by hour (0–23)
      const counts = Array(24).fill(0);
      arr.forEach((o: any) => {
        try { counts[new Date(o.createdAt).getHours()] += 1; } catch {}
      });
      const maxVal = Math.max(...counts, 1);
      return counts
        .filter((_, h) => h % 3 === 0) // show every 3rd hour to avoid clutter
        .map((count, i) => ({ label: `${i * 3}`, heightPercent: (count / maxVal) * 100 }));
    }

    // Week & Month: bucket by day-of-week label
    const days = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    const counts = Array(7).fill(0);
    arr.forEach((o: any) => {
      try { counts[new Date(o.createdAt).getDay()] += 1; } catch {}
    });
    const maxVal = Math.max(...counts, 1);
    return counts.map((count, idx) => ({ label: days[idx], heightPercent: (count / maxVal) * 100 }));
  };

  const chartData = compileChart(periodOrders, period);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing[4], gap: spacing[5] }}>
      <View style={styles.periods}>
        {PERIODS.map((p, i) => (
          <Pressable key={p} style={[styles.period, period === i && styles.periodActive]} onPress={() => setPeriod(i)}>
            <Text style={[styles.periodText, period === i && styles.periodTextActive]}>{p}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.cards}>
        <Card label="إجمالي المبيعات" value={`₪${totalSales}`} />
        <Card label="عدد الطلبات" value={String(periodOrders.length)} />
        <Card label="متوسط الطلب" value={`₪${avgOrder}`} />
        <Card label="التقييم العام" value={`${business?.rating ? business.rating.toFixed(1) : '5.0'} ⭐`} />
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>الطلبات اليومية (هذا الأسبوع)</Text>
        <View style={styles.chart}>
          {chartData.map((d, i) => (
            <View key={i} style={styles.barCol}>
              <View style={[styles.bar, { height: `${d.heightPercent}%` }]} />
              <Text style={styles.barLabel}>{d.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>أكثر المنتجات طلباً</Text>
        <View style={{ gap: spacing[3], marginTop: spacing[3] }}>
          {topProducts.length === 0 ? (
            <Text style={styles.empty}>لا توجد بيانات لمنتجات مكتملة في هذه الفترة</Text>
          ) : (
            topProducts.map((t, i) => (
              <View key={t.name} style={styles.topRow}>
                <Text style={styles.topRank}>{i + 1}</Text>
                <Text style={styles.topName}>{t.name}</Text>
                <Text style={styles.topCount}>{t.count} طلب</Text>
              </View>
            ))
          )}
        </View>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>أحدث الطلبات المكتملة</Text>
        <View style={{ gap: spacing[3], marginTop: spacing[3] }}>
          {completedOrders.length === 0 ? (
            <Text style={styles.empty}>لا توجد طلبات مكتملة في هذه الفترة</Text>
          ) : (
            completedOrders.slice(0, 5).map((o: any) => (
              <View key={o.id} style={styles.historyCard}>
                <View style={styles.historyRow}>
                  <Text style={styles.historyTitle}>طلب #{o.id.slice(-6).toUpperCase()}</Text>
                  <Text style={styles.historyAmount}>{o.total} ₪</Text>
                </View>
                <Text style={styles.historyMuted}>العميل: {o.customer?.name}</Text>
                <Text style={styles.historyMuted}>السائق: {o.driver?.user?.name || 'غير متوفر'}</Text>
                
                {o.items && o.items.length > 0 && (
                  <View style={{ marginTop: spacing[2], paddingTop: spacing[2], borderTopWidth: 1, borderTopColor: colors.border }}>
                    {o.items.map((it: any) => (
                      <Text key={it.id} style={[styles.historyMuted, { fontSize: 11 }]}>
                        - {it.product?.name} (x{it.quantity})
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  periods: { flexDirection: 'row', gap: spacing[2], backgroundColor: colors.surface, padding: 4, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  period: { flex: 1, paddingVertical: spacing[2], borderRadius: radius.sm, alignItems: 'center' },
  periodActive: { backgroundColor: colors.primary },
  periodText: { color: colors.textMuted, fontFamily: fontFamily.semibold },
  periodTextActive: { color: '#fff' },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  statCard: { width: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, alignItems: 'flex-end' },
  statValue: { fontSize: fontSizes.xl, fontFamily: fontFamily.extrabold, color: colors.textPrimary },
  statLabel: { color: colors.textMuted, fontSize: fontSizes.sm, marginTop: 2 },
  chartCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: fontSizes.lg, fontFamily: fontFamily.bold, color: colors.textPrimary, textAlign: 'right' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 160, marginTop: spacing[4] },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 6 },
  bar: { width: '60%', backgroundColor: colors.primary, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  barLabel: { color: colors.textMuted, fontSize: fontSizes.xs },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  topRank: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, color: '#fff', textAlign: 'center', lineHeight: 24, fontFamily: fontFamily.bold },
  topName: { flex: 1, color: colors.textPrimary, fontSize: fontSizes.base, textAlign: 'right' },
  topCount: { color: colors.primary, fontFamily: fontFamily.bold },
  empty: { textAlign: 'center', color: colors.textMuted, fontSize: fontSizes.sm },
  historyCard: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing[3], borderWidth: 1, borderColor: colors.border },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  historyTitle: { fontFamily: fontFamily.bold, color: colors.textPrimary, fontSize: fontSizes.base },
  historyAmount: { color: colors.primary, fontFamily: fontFamily.bold },
  historyMuted: { color: colors.textMuted, fontSize: fontSizes.sm, textAlign: 'right' },
});
