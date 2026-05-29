import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, radius, spacing } from '../../src/theme';

export default function DriverHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [available, setAvailable] = useState(true);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingTop: insets.top + 8, padding: spacing[4], gap: spacing[5] }}>
      <Text style={styles.greeting}>مرحباً كريم 👋</Text>

      {/* Availability */}
      <View style={styles.availCard}>
        <View>
          <Text style={[styles.availStatus, { color: available ? colors.success : colors.error }]}>
            {available ? '🟢 متاح للتوصيل' : '🔴 غير متاح'}
          </Text>
          <Text style={styles.muted}>المنطقة: رام الله - المصيون</Text>
        </View>
        <Switch value={available} onValueChange={setAvailable} trackColor={{ true: colors.primary }} />
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <Stat label="توصيلات" value="8" />
        <Stat label="المكسب" value="₪96" />
        <Stat label="التقييم" value="4.9" />
      </View>

      {/* Current order */}
      <View>
        <Text style={styles.sectionTitle}>الطلب الحالي</Text>
        <Pressable style={styles.orderCard} onPress={() => router.push('/active-delivery')}>
          <View style={styles.orderRow}>
            <Text style={styles.orderTitle}>مطعم القدس</Text>
            <Text style={styles.amount}>45 ₪</Text>
          </View>
          <Text style={styles.muted}>إلى: نابلس - المركز</Text>
          <View style={styles.deliverBtn}><Text style={styles.deliverText}>عرض التفاصيل</Text></View>
        </Pressable>
      </View>

      {/* Simulate incoming request */}
      <Pressable style={styles.simulate} onPress={() => router.push('/request-alert')}>
        <Text style={styles.simulateText}>🔔 محاكاة طلب جديد</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  greeting: { fontSize: fontSizes['2xl'], fontWeight: '800', color: colors.primary },
  availCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border },
  availStatus: { fontSize: fontSizes.lg, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: fontSizes.sm, marginTop: 2 },
  stats: { flexDirection: 'row', gap: spacing[3] },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  statValue: { fontSize: fontSizes['2xl'], fontWeight: '800', color: colors.textPrimary },
  statLabel: { color: colors.textMuted, fontSize: fontSizes.sm },
  sectionTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing[3] },
  orderCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, gap: 4 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderTitle: { fontSize: fontSizes.base, fontWeight: '700', color: colors.textPrimary },
  amount: { color: colors.primary, fontWeight: '700' },
  deliverBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing[3], alignItems: 'center', marginTop: spacing[3] },
  deliverText: { color: '#fff', fontWeight: '700' },
  simulate: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.md, padding: spacing[4], alignItems: 'center' },
  simulateText: { color: colors.primary, fontWeight: '700' },
});
