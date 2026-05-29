import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, radius, spacing } from '../../src/theme';

const DELIVERIES = [
  { id: 'D-501', business: 'مطعم القدس', area: 'نابلس - المركز', date: '29 مايو، 13:20', amount: 45, status: 'تم التسليم' },
  { id: 'D-498', business: 'حمص البركة', area: 'نابلس - رفيديا', date: '29 مايو، 11:05', amount: 28, status: 'تم التسليم' },
  { id: 'D-495', business: 'حلويات النصر', area: 'نابلس - المخفية', date: '28 مايو، 19:40', amount: 60, status: 'تم التسليم' },
];

export default function History() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing[4], gap: spacing[3] }}>
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>إجمالي هذا الشهر</Text>
        <Text style={styles.summaryValue}>₪1,240</Text>
      </View>

      {DELIVERIES.map((d) => (
        <View key={d.id} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.business}>{d.business}</Text>
            <Text style={styles.amount}>{d.amount} ₪</Text>
          </View>
          <Text style={styles.muted}>{d.area}</Text>
          <View style={styles.row}>
            <Text style={styles.muted}>{d.date}</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>{d.status}</Text></View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  summary: { backgroundColor: colors.secondary, borderRadius: radius.lg, padding: spacing[5], alignItems: 'center' },
  summaryLabel: { color: '#fff', opacity: 0.9 },
  summaryValue: { color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 4 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  business: { fontSize: fontSizes.base, fontWeight: '700', color: colors.textPrimary },
  amount: { color: colors.primary, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: fontSizes.sm },
  badge: { backgroundColor: '#DCFCE7', borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: 4 },
  badgeText: { color: '#166534', fontWeight: '700', fontSize: fontSizes.xs },
});
