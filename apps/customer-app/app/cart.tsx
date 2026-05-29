import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@shu/ui-components/native';
import { colors, fontSizes, radius, spacing } from '../src/theme';
import { PRODUCTS } from '../src/mock';

export default function Cart() {
  const router = useRouter();
  const [items, setItems] = useState(
    PRODUCTS.slice(0, 2).map((p) => ({ ...p, qty: 1 })),
  );
  const [payment, setPayment] = useState<'cash' | 'card'>('cash');

  const setQty = (id: string, delta: number) =>
    setItems((arr) =>
      arr
        .map((it) => (it.id === id ? { ...it, qty: Math.max(0, it.qty + delta) } : it))
        .filter((it) => it.qty > 0),
    );

  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const fee = 3;
  const total = subtotal + fee;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing[4], paddingBottom: 120, gap: spacing[3] }}>
        {items.map((it) => (
          <View key={it.id} style={styles.item}>
            <View style={styles.img}><Text style={{ fontSize: 28 }}>🍽️</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{it.name}</Text>
              <Text style={styles.price}>{it.price} ₪</Text>
            </View>
            <View style={styles.qtyRow}>
              <Pressable style={styles.qtyBtn} onPress={() => setQty(it.id, -1)}><Text style={styles.qtySign}>−</Text></Pressable>
              <Text style={styles.qty}>{it.qty}</Text>
              <Pressable style={styles.qtyBtn} onPress={() => setQty(it.id, 1)}><Text style={styles.qtySign}>+</Text></Pressable>
            </View>
          </View>
        ))}

        {/* Summary */}
        <View style={styles.summary}>
          <Row label="المجموع الفرعي" value={`${subtotal} ₪`} />
          <Row label="رسوم التوصيل" value={`${fee} ₪`} />
          <View style={styles.divider} />
          <Row label="الإجمالي" value={`${total} ₪`} bold />
        </View>

        {/* Payment */}
        <Text style={styles.sectionTitle}>طريقة الدفع</Text>
        <Pressable style={styles.payOption} onPress={() => setPayment('cash')}>
          <View style={[styles.radio, payment === 'cash' && styles.radioOn]} />
          <Text style={styles.payText}>نقدي عند الاستلام</Text>
        </Pressable>
        <Pressable style={styles.payOption} onPress={() => setPayment('card')}>
          <View style={[styles.radio, payment === 'card' && styles.radioOn]} />
          <Text style={styles.payText}>دفع إلكتروني</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="تأكيد الطلب" onPress={() => router.replace('/tracking')} />
      </View>
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[3], borderWidth: 1, borderColor: colors.border },
  img: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: fontSizes.base, fontWeight: '700', color: colors.textPrimary },
  price: { color: colors.primary, fontWeight: '700', marginTop: 2 },
  qtyRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing[3] },
  qtyBtn: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  qtySign: { fontSize: 18, fontWeight: '700', color: colors.primary },
  qty: { fontSize: fontSizes.base, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  summary: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, gap: spacing[2], marginTop: spacing[2] },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: colors.textMuted, fontSize: fontSizes.base },
  rowValue: { color: colors.textPrimary, fontSize: fontSizes.base },
  bold: { fontWeight: '700', color: colors.textPrimary, fontSize: fontSizes.lg },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing[1] },
  sectionTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.textPrimary, marginTop: spacing[2] },
  payOption: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing[4], borderWidth: 1, borderColor: colors.border },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border },
  radioOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  payText: { fontSize: fontSizes.base, color: colors.textPrimary },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing[4], backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
