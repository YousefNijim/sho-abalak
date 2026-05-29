import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, radius, spacing } from '../../src/theme';

const PERIODS = ['اليوم', 'الأسبوع', 'الشهر'];
const BARS = [40, 65, 90, 55, 75, 50, 80];
const DAYS = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'];
const TOP = [
  { name: 'شاورما دجاج', count: 142 },
  { name: 'شاورما لحمة', count: 98 },
  { name: 'صحن حمص', count: 76 },
  { name: 'عصير برتقال', count: 54 },
];

export default function Analytics() {
  const [period, setPeriod] = useState(0);

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
        <Card label="إجمالي المبيعات" value="₪8,420" />
        <Card label="عدد الطلبات" value="312" />
        <Card label="متوسط الطلب" value="₪27" />
        <Card label="التقييم العام" value="4.8 ⭐" />
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>الطلبات اليومية</Text>
        <View style={styles.chart}>
          {BARS.map((h, i) => (
            <View key={i} style={styles.barCol}>
              <View style={[styles.bar, { height: `${h}%` }]} />
              <Text style={styles.barLabel}>{DAYS[i]}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>أكثر المنتجات طلباً</Text>
        <View style={{ gap: spacing[3], marginTop: spacing[3] }}>
          {TOP.map((t, i) => (
            <View key={t.name} style={styles.topRow}>
              <Text style={styles.topRank}>{i + 1}</Text>
              <Text style={styles.topName}>{t.name}</Text>
              <Text style={styles.topCount}>{t.count}</Text>
            </View>
          ))}
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
  periodText: { color: colors.textMuted, fontWeight: '600' },
  periodTextActive: { color: '#fff' },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  statCard: { width: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: fontSizes['2xl'], fontWeight: '800', color: colors.textPrimary },
  statLabel: { color: colors.textMuted, fontSize: fontSizes.sm, marginTop: 2 },
  chartCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.textPrimary },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 160, marginTop: spacing[4] },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 6 },
  bar: { width: '60%', backgroundColor: colors.primary, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  barLabel: { color: colors.textMuted, fontSize: fontSizes.xs },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  topRank: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, color: '#fff', textAlign: 'center', lineHeight: 24, fontWeight: '700' },
  topName: { flex: 1, color: colors.textPrimary, fontSize: fontSizes.base },
  topCount: { color: colors.primary, fontWeight: '700' },
});
