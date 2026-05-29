import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fontSizes, radius, spacing } from '../../src/theme';
import { ORDERS } from '../../src/mock';

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  DELIVERED: { label: 'تم التسليم', bg: '#DCFCE7', fg: '#166534' },
  PREPARING: { label: 'جاري التحضير', bg: '#FFEDD5', fg: '#C2410C' },
  PICKED_UP: { label: 'في الطريق', bg: '#CFFAFE', fg: '#0E7490' },
  CANCELLED: { label: 'ملغى', bg: '#FEE2E2', fg: '#991B1B' },
};

export default function Orders() {
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const current = ORDERS.filter((o) => o.status === 'PREPARING' || o.status === 'PICKED_UP');
  const past = ORDERS.filter((o) => o.status === 'DELIVERED' || o.status === 'CANCELLED');
  const list = tab === 0 ? current : past;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.tabs}>
        {['الحالية', 'السابقة'].map((t, i) => (
          <Pressable key={t} style={[styles.tab, tab === i && styles.tabActive]} onPress={() => setTab(i)}>
            <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[4] }}>
        {list.map((o) => {
          const s = STATUS[o.status];
          return (
            <View key={o.id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.business}>{o.business}</Text>
                <View style={[styles.badge, { backgroundColor: s.bg }]}>
                  <Text style={[styles.badgeText, { color: s.fg }]}>{s.label}</Text>
                </View>
              </View>
              <Text style={styles.muted}>{o.date}</Text>
              <Text style={styles.muted}>{o.items} عناصر · {o.total} ₪</Text>
              <View style={styles.actions}>
                <Pressable style={styles.secondaryBtn}>
                  <Text style={styles.secondaryText}>أعد الطلب</Text>
                </Pressable>
                <Pressable style={styles.detailsBtn} onPress={() => router.push('/tracking')}>
                  <Text style={styles.detailsText}>تفاصيل</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
        {list.length === 0 ? <Text style={styles.empty}>لا توجد طلبات</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', padding: spacing[4], gap: spacing[2] },
  tab: { flex: 1, paddingVertical: spacing[3], borderRadius: radius.md, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  business: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.textPrimary },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.full },
  badgeText: { fontSize: fontSizes.xs, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: fontSizes.sm },
  actions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[3] },
  secondaryBtn: { flex: 1, height: 44, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.primary, fontWeight: '700' },
  detailsBtn: { flex: 1, height: 44, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  detailsText: { color: '#fff', fontWeight: '700' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing[12] },
});
