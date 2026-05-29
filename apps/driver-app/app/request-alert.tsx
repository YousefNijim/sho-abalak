import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@shu/ui-components/native';
import { colors, fontSizes, fontFamily, radius, spacing } from '../src/theme';
import { ordersApi } from '@shu/api-client';

export default function RequestAlert() {
  const router = useRouter();
  const { orderId, businessName, areaName, total } = useLocalSearchParams<{
    orderId: string;
    businessName: string;
    areaName: string;
    total: string;
  }>();

  const [seconds, setSeconds] = useState(165);

  const rejectMutation = useMutation({
    mutationFn: () => ordersApi.rejectDriver(orderId!),
    onSettled: () => {
      router.back();
    },
  });

  const handleReject = () => {
    if (orderId && !rejectMutation.isPending) {
      rejectMutation.mutate();
    } else {
      router.back();
    }
  };

  useEffect(() => {
    if (seconds <= 0) {
      handleReject();
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

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
        <Button 
          title={rejectMutation.isPending ? "جاري الرفض..." : "❌ رفض"} 
          variant="danger" 
          style={{ flex: 1 }} 
          onPress={handleReject}
          disabled={rejectMutation.isPending}
        />
        <Button
          title="✅ قبول"
          style={{ flex: 1 }}
          disabled={rejectMutation.isPending}
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
  title: { fontSize: fontSizes['2xl'], fontFamily: fontFamily.extrabold, color: colors.textPrimary, marginVertical: spacing[4] },
  card: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, gap: spacing[3] },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  muted: { color: colors.textMuted, fontSize: fontSizes.base },
  value: { color: colors.textPrimary, fontFamily: fontFamily.bold, fontSize: fontSizes.base },
  timer: { fontSize: 40, fontFamily: fontFamily.extrabold, color: colors.primary, marginVertical: spacing[5] },
  actions: { flexDirection: 'row', gap: spacing[3], width: '100%' },
});
