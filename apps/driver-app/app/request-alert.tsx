import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@shu/ui-components/native';
import { MapPin } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, fontFamily, radius, spacing } from '../src/theme';
import { ordersApi } from '@shu/api-client';

export default function RequestAlert() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orderId, businessName, areaName, addressDetail, total } = useLocalSearchParams<{
    orderId: string;
    businessName: string;
    areaName: string;
    addressDetail: string;
    total: string;
  }>();

  const [seconds, setSeconds] = useState(165);
  // Prevent double-action after accept or reject fires
  const settled = useRef(false);

  const acceptMutation = useMutation({
    mutationFn: () => ordersApi.acceptDriver(orderId!),
    onSuccess: () => {
      settled.current = true;
      // Fix 6: dismiss this screen then navigate to active delivery
      router.replace({
        pathname: '/active-delivery',
        params: { orderId: orderId! },
      });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'فشل قبول الطلب.';
      Alert.alert('خطأ', msg);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => ordersApi.rejectDriver(orderId!),
    onSettled: () => {
      settled.current = true;
      // Fix 6: always dismiss after reject
      router.back();
    },
  });

  const handleReject = () => {
    if (settled.current) return;
    if (orderId && !rejectMutation.isPending && !acceptMutation.isPending) {
      rejectMutation.mutate();
    } else if (!orderId) {
      router.back();
    }
  };

  const handleAccept = () => {
    if (settled.current) return;
    if (!acceptMutation.isPending && !rejectMutation.isPending) {
      acceptMutation.mutate();
    }
  };

  useEffect(() => {
    if (seconds <= 0) {
      handleReject();
      return;
    }
    if (settled.current) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  const isBusy = acceptMutation.isPending || rejectMutation.isPending;

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>📦</Text>
      <Text style={styles.title}>طلب جديد!</Text>

      <View style={styles.card}>
        <Row label="المنشأة" value={businessName || 'مطعم القدس'} />
        <Row label="مبلغ الطلب" value={`${total || '45'} ₪`} />
        <View style={styles.divider} />
        <Text style={styles.addressTitle}>عنوان التوصيل</Text>
        <View style={styles.addressBlock}>
          <MapPin size={16} color={colors.primary} style={{ marginLeft: spacing[2] }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.addressAreaName}>{areaName || 'منطقة التوصيل'}</Text>
            {!!addressDetail && (
              <Text style={styles.addressDetail}>{addressDetail}</Text>
            )}
          </View>
        </View>
      </View>

      <Text style={styles.timer}>{mm}:{ss}</Text>

      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing[2] }]}>
        <Button
          title={rejectMutation.isPending ? 'جاري الرفض...' : '❌ رفض'}
          variant="danger"
          style={{ flex: 1 }}
          onPress={handleReject}
          disabled={isBusy}
        />
        <Button
          title={acceptMutation.isPending ? 'جاري القبول...' : '✅ قبول'}
          style={{ flex: 1 }}
          onPress={handleAccept}
          disabled={isBusy}
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
  divider: { height: 1, backgroundColor: colors.border },
  addressTitle: { fontFamily: fontFamily.semibold, fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'right' },
  addressBlock: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] },
  addressAreaName: { fontFamily: fontFamily.bold, fontSize: fontSizes.base, color: colors.textPrimary, textAlign: 'right' },
  addressDetail: { fontFamily: fontFamily.regular, fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'right', marginTop: 2 },
});
