import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, radius, spacing } from '../../src/theme';
import { ORDERS } from '../../src/mock';

const TABS = [
  { key: 'new', label: 'جديد' },
  { key: 'active', label: 'جاري' },
  { key: 'done', label: 'منتهي' },
] as const;

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<'new' | 'active' | 'done'>('new');
  const orders = ORDERS.filter((o) => o.stage === tab);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={styles.storeName}>مطعم القدس</Text>
          <Text style={[styles.status, { color: open ? colors.success : colors.error }]}>
            {open ? '🟢 مفتوح' : '🔴 مغلق'}
          </Text>
        </View>
        <Switch value={open} onValueChange={setOpen} trackColor={{ true: colors.primary }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing[4], paddingBottom: 24 }}>
        {/* Stats */}
        <View style={styles.statsGrid}>
          <Stat label="طلبات اليوم" value="32" bg={colors.primary} />
          <Stat label="الإيراد" value="₪1,240" bg={colors.secondary} />
          <Stat label="قيد التحضير" value="5" bg={colors.primary} />
          <Stat label="مكتملة" value="27" bg={colors.secondary} />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((t) => (
            <Pressable key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
              {t.key === 'new' ? <View style={styles.redDot} /> : null}
            </Pressable>
          ))}
        </View>

        {/* Orders */}
        <View style={{ gap: spacing[3] }}>
          {orders.map((o) => (
            <Pressable key={o.id} style={styles.orderCard} onPress={() => router.push(`/order/${o.id}`)}>
              <View style={styles.orderRow}>
                <Text style={styles.orderId}>طلب #{o.id}</Text>
                <Text style={styles.muted}>{o.time}</Text>
              </View>
              <Text style={styles.customer}>{o.customer}</Text>
              <View style={styles.orderRow}>
                <Text style={styles.muted}>{o.items} عناصر</Text>
                <Text style={styles.total}>{o.total} ₪</Text>
              </View>
            </Pressable>
          ))}
          {orders.length === 0 ? <Text style={styles.empty}>لا توجد طلبات</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, bg }: { label: string; value: string; bg: string }) {
  return (
    <View style={[styles.stat, { backgroundColor: bg }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing[4], backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  storeName: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.textPrimary },
  status: { fontSize: fontSizes.sm, marginTop: 2, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], marginBottom: spacing[5] },
  stat: { width: '47%', borderRadius: radius.lg, padding: spacing[4], flexGrow: 1 },
  statValue: { color: '#fff', fontSize: 28, fontWeight: '800' },
  statLabel: { color: '#fff', fontSize: fontSizes.sm, opacity: 0.9, marginTop: 2 },
  tabs: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[4] },
  tab: { flex: 1, paddingVertical: spacing[3], borderRadius: radius.md, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  redDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  orderCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, gap: 4 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontWeight: '700', color: colors.textPrimary, fontSize: fontSizes.base },
  customer: { color: colors.textPrimary, fontSize: fontSizes.base },
  muted: { color: colors.textMuted, fontSize: fontSizes.sm },
  total: { color: colors.primary, fontWeight: '700', fontSize: fontSizes.base },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing[10] },
});
