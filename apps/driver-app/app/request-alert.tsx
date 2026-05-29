import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@shu/ui-components/native';
import { colors, fontSizes, radius, spacing } from '../src/theme';

export default function RequestAlert() {
  const router = useRouter();
  const { orderId, businessName, areaName, total } = useLocalSearchParams<{
    orderId: string;
    businessName: string;
    areaName: string;
    total: string;
  }>();

  const [seconds, setSeconds] = useState(165);

  useEffect(() => {
    if (seconds <= 0) {
      router.back();
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, router]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>📦</Text>
      <Text style={styles.title}>طلب جديد!</Text>

      <View style={styles.card}>
        <Row label="المنشأة" value={businessName || 'مطعم القدس'} />
        <Row label="المنطقة" value={areaName || 'رام الله - المصيون'} />
        <Row label="المسافة التقديرية" value="~2 كم" />
        <Row label="مبلغ الطلب" value={`${total || '45'} ₪`} />
        <Row label="طريقة الدفع" value="نقدي" />
      </View>

      <Text style={styles.timer}>{mm}:{ss}</Text>

      <View style={styles.actions}>
        <Button title="❌ رفض" variant="danger" style={{ flex: 1 }} onPress={() => router.back()} />
        <Button
          title="✅ قبول"
          style={{ flex: 1 }}
          onPress={() =>
            router.replace({
              pathname: '/active-delivery',
              params: { orderId: orderId || 'D-501' },
            })
          }
        />
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing[5], backgroundColor: colors.background, alignItems: 'center' },
  emoji: { fontSize: 56, marginTop: spacing[6] },
  title: { fontSize: fontSizes['2xl'], fontWeight: '800', color: colors.textPrimary, marginVertical: spacing[4] },
  card: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, gap: spacing[3] },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  muted: { color: colors.textMuted, fontSize: fontSizes.base },
  value: { color: colors.textPrimary, fontWeight: '700', fontSize: fontSizes.base },
  timer: { fontSize: 40, fontWeight: '800', color: colors.primary, marginVertical: spacing[5] },
  actions: { flexDirection: 'row', gap: spacing[3], width: '100%' },
});
