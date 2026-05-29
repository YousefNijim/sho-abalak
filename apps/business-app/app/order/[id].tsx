import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@shu/ui-components/native';
import { colors, fontSizes, radius, spacing } from '../../src/theme';
import { ORDERS } from '../../src/mock';

type Stage = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY';

const ITEMS = [
  { name: 'شاورما دجاج ×2', price: 36 },
  { name: 'صحن حمص ×1', price: 12 },
  { name: 'عصير برتقال ×3', price: 24 },
];

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const order = ORDERS.find((o) => o.id === id) ?? ORDERS[0];
  const [stage, setStage] = useState<Stage>('PENDING');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing[4], paddingBottom: 24, gap: spacing[4] }}>
        <View>
          <Text style={styles.title}>طلب #{order.id}</Text>
          <Text style={styles.muted}>{order.customer}</Text>
        </View>

        <View style={styles.card}>
          {ITEMS.map((it) => (
            <View key={it.name} style={styles.itemRow}>
              <Text style={styles.itemName}>{it.name}</Text>
              <Text style={styles.itemPrice}>{it.price} ₪</Text>
            </View>
          ))}
        </View>

        <View style={styles.note}>
          <Text style={styles.noteText}>ملاحظة الزبون: بدون بصل، صوص زيادة 🙏</Text>
        </View>

        <View style={styles.infoCard}>
          <Info label="المنطقة" value="رام الله - المصيون" />
          <Info label="طريقة الدفع" value="نقدي" />
          <Info label="الإجمالي" value={`${order.total} ₪`} bold />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {stage === 'PENDING' ? (
          <View style={styles.btnRow}>
            <Button title="رفض" variant="danger" style={{ flex: 1 }} onPress={() => router.back()} />
            <Button title="قبول الطلب" style={{ flex: 1 }} onPress={() => setStage('CONFIRMED')} />
          </View>
        ) : stage === 'CONFIRMED' ? (
          <Button title="بدء التحضير" onPress={() => setStage('PREPARING')} />
        ) : stage === 'PREPARING' ? (
          <Button title="الطلب جاهز ✅" onPress={() => setStage('READY')} />
        ) : (
          <Button title="اختيار سائق 🚗" onPress={() => router.push('/driver-selection')} />
        )}
      </View>
    </View>
  );
}

function Info({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={[styles.infoValue, bold && { fontWeight: '800', color: colors.primary, fontSize: fontSizes.lg }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSizes.xl, fontWeight: '700', color: colors.textPrimary },
  muted: { color: colors.textMuted, fontSize: fontSizes.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, gap: spacing[2] },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  itemName: { color: colors.textPrimary, fontSize: fontSizes.base },
  itemPrice: { color: colors.textPrimary, fontWeight: '600' },
  note: { backgroundColor: '#FEF9C3', borderRadius: radius.md, padding: spacing[3] },
  noteText: { color: '#854D0E', fontSize: fontSizes.sm },
  infoCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, gap: spacing[2] },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoValue: { color: colors.textPrimary, fontSize: fontSizes.base },
  footer: { padding: spacing[4], backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
  btnRow: { flexDirection: 'row', gap: spacing[3] },
});
