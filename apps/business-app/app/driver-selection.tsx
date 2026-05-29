import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@shu/ui-components/native';
import { colors, fontSizes, radius, spacing } from '../src/theme';
import { DRIVERS } from '../src/mock';

export default function DriverSelection() {
  const router = useRouter();
  const [filter, setFilter] = useState<'mine' | 'all'>('mine');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.filters}>
        {[
          { key: 'mine', label: 'منطقتي فقط' },
          { key: 'all', label: 'الكل المتاحين' },
        ].map((f) => (
          <Pressable key={f.key} style={[styles.filter, filter === f.key && styles.filterActive]} onPress={() => setFilter(f.key as 'mine' | 'all')}>
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[3] }}>
        {DRIVERS.map((d) => (
          <View key={d.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.avatar}><Text style={{ fontSize: 24 }}>🛵</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{d.name}</Text>
                <Text style={styles.muted}>{d.area}</Text>
                <Text style={styles.muted}>✅ {d.deliveries} توصيلة · ⭐ {d.rating}</Text>
              </View>
              <View style={styles.availTag}><Text style={styles.availText}>متاح</Text></View>
            </View>
            <Button title="إرسال الطلب" onPress={() => router.back()} style={{ marginTop: spacing[3] }} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: spacing[2], padding: spacing[4] },
  filter: { flex: 1, paddingVertical: spacing[3], borderRadius: radius.md, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.textMuted, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: fontSizes.base, fontWeight: '700', color: colors.textPrimary },
  muted: { color: colors.textMuted, fontSize: fontSizes.sm },
  availTag: { backgroundColor: '#DCFCE7', borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: 4 },
  availText: { color: '#166534', fontWeight: '700', fontSize: fontSizes.sm },
});
