import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@shu/ui-components/native';
import { MapPin } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, fontFamily, radius, spacing } from '../src/theme';
import { ordersApi } from '@shu/api-client';

interface OrderSummary {
  orderId: string;
  businessName: string;
  areaName: string;
  addressDetail?: string;
  total: number;
  items: { name: string; quantity: number }[];
}

export default function RequestAlert() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { batchId, ordersJson } = useLocalSearchParams<{ batchId: string; ordersJson: string }>();

  const orders: OrderSummary[] = (() => {
    try { return JSON.parse(ordersJson || '[]'); }
    catch { return []; }
  })();

  const primaryOrderId = orders[0]?.orderId;
  const isBatch = orders.length > 1;
  const grandTotal = orders.reduce((sum, o) => sum + o.total, 0);

  const [seconds, setSeconds] = useState(165);
  const settled = useRef(false);

  const acceptMutation = useMutation({
    // Accept via the first order — server resolves the whole batch by batchId
    mutationFn: () => ordersApi.acceptDriver(primaryOrderId!),
    onSuccess: (acceptedOrders) => {
      settled.current = true;
      const firstId = Array.isArray(acceptedOrders) ? acceptedOrders[0]?.id : (acceptedOrders as any)?.id;
      router.replace({
        pathname: '/active-delivery',
        params: {
          primaryOrderId: primaryOrderId!,
          batchId: batchId ?? '',
        },
      });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'فشل قبول الطلب.';
      Alert.alert('خطأ', msg);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => ordersApi.rejectDriver(primaryOrderId!),
    onSettled: () => {
      settled.current = true;
      router.back();
    },
  });

  const handleReject = () => {
    if (settled.current) return;
    if (primaryOrderId && !rejectMutation.isPending && !acceptMutation.isPending) {
      rejectMutation.mutate();
    } else if (!primaryOrderId) {
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
    if (seconds <= 0) { handleReject(); return; }
    if (settled.current) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const isBusy = acceptMutation.isPending || rejectMutation.isPending;

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{isBatch ? '📦📦' : '📦'}</Text>
      <Text style={styles.title}>{isBatch ? `${orders.length} طلبات جديدة!` : 'طلب جديد!'}</Text>
      {isBatch && (
        <Text style={styles.batchSubtitle}>
          يمكنك توصيل هذه الطلبات معاً — جميعها في نفس المدينة
        </Text>
      )}

      <Text style={styles.timer}>{mm}:{ss}</Text>

      <ScrollView style={styles.ordersScroll} contentContainerStyle={{ gap: spacing[3] }}>
        {orders.map((o, idx) => (
          <View key={o.orderId} style={styles.orderCard}>
            {isBatch && (
              <Text style={styles.orderIndex}>الطلب {idx + 1} من {orders.length}</Text>
            )}
            <View style={styles.row}>
              <Text style={styles.muted}>المنشأة</Text>
              <Text style={styles.value}>{o.businessName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.muted}>المبلغ</Text>
              <Text style={styles.value}>{o.total} ₪</Text>
            </View>

            {/* Items list */}
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>محتويات الطلب</Text>
            {o.items.map((it, i) => (
              <View key={i} style={styles.itemRow}>
                <Text style={styles.itemQty}>x{it.quantity}</Text>
                <Text style={styles.itemName}>{it.name}</Text>
              </View>
            ))}

            {/* Delivery address */}
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>عنوان التوصيل</Text>
            <View style={styles.addressBlock}>
              <MapPin size={16} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.addressAreaName}>{o.areaName}</Text>
                {!!o.addressDetail && <Text style={styles.addressDetail}>{o.addressDetail}</Text>}
              </View>
            </View>
          </View>
        ))}

        {isBatch && (
          <View style={styles.totalCard}>
            <Text style={styles.muted}>إجمالي جميع الطلبات</Text>
            <Text style={styles.grandTotal}>{grandTotal} ₪</Text>
          </View>
        )}
      </ScrollView>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  emoji: { fontSize: 48, textAlign: 'center', marginTop: spacing[5] },
  title: { fontSize: fontSizes['2xl'], fontFamily: fontFamily.extrabold, color: colors.textPrimary, textAlign: 'center', marginTop: spacing[2] },
  batchSubtitle: { fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'center', marginHorizontal: spacing[5], marginTop: spacing[1] },
  timer: { fontSize: 36, fontFamily: fontFamily.extrabold, color: colors.primary, textAlign: 'center', marginVertical: spacing[3] },
  ordersScroll: { flex: 1, paddingHorizontal: spacing[4] },
  orderCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, gap: spacing[2] },
  orderIndex: { fontSize: fontSizes.sm, fontFamily: fontFamily.bold, color: colors.primary, textAlign: 'right', marginBottom: spacing[1] },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  muted: { color: colors.textMuted, fontSize: fontSizes.base },
  value: { color: colors.textPrimary, fontFamily: fontFamily.bold, fontSize: fontSizes.base },
  divider: { height: 1, backgroundColor: colors.border },
  sectionLabel: { fontFamily: fontFamily.semibold, fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'right' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemQty: { fontFamily: fontFamily.bold, color: colors.primary, fontSize: fontSizes.sm },
  itemName: { color: colors.textPrimary, fontSize: fontSizes.sm, textAlign: 'right', flex: 1 },
  addressBlock: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] },
  addressAreaName: { fontFamily: fontFamily.bold, fontSize: fontSizes.base, color: colors.textPrimary, textAlign: 'right' },
  addressDetail: { fontFamily: fontFamily.regular, fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'right', marginTop: 2 },
  totalCard: { backgroundColor: colors.primary + '10', borderRadius: radius.lg, padding: spacing[4], flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.primary + '30' },
  grandTotal: { fontFamily: fontFamily.extrabold, fontSize: fontSizes.xl, color: colors.primary },
  actions: { flexDirection: 'row', gap: spacing[3], padding: spacing[4], backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
