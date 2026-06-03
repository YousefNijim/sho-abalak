import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@shu/ui-components/native';
import { ordersApi } from '@shu/api-client';
import type { Order } from '@shu/api-client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, fontFamily, radius, spacing } from '../src/theme';

// Step 0: Driver heading to business to pick up orders
// Step 1: Orders picked up — driver delivers each one individually
const STEPS = ['في الطريق للمنشأة', 'جاري التوصيل للزبائن'];

export default function ActiveDelivery() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{
    orderId?: string;
    primaryOrderId?: string;
    batchId?: string;
  }>();

  const primaryOrderId = params.primaryOrderId || params.orderId;
  const batchId = params.batchId || null;

  const [step, setStep] = useState(0);
  const advancing = useRef(false);

  const { data: batchOrders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['active-batch', primaryOrderId, batchId],
    queryFn: async () => {
      if (!primaryOrderId) return [];
      const primary = await ordersApi.getById(primaryOrderId);
      if (!batchId || !primary.batchId) return [primary];
      const all = await ordersApi.list();
      const list = Array.isArray(all) ? all : [];
      return list.filter((o: any) => o.batchId === primary.batchId);
    },
    enabled: !!primaryOrderId,
    refetchInterval: 5000,
  });

  const [deliveredIds, setDeliveredIds] = useState<Set<string>>(new Set());

  const deliverMutation = useMutation({
    mutationFn: (orderId: string) => ordersApi.updateStatus(orderId, { status: 'DELIVERED' }),
    onSuccess: (_, orderId) => {
      advancing.current = false;
      setDeliveredIds((prev) => new Set([...prev, orderId]));
      queryClient.invalidateQueries({ queryKey: ['active-batch', primaryOrderId, batchId] });
      queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
    },
    onError: (err: any) => {
      advancing.current = false;
      const msg = err.response?.data?.message || 'فشل تحديث حالة الطلب.';
      Alert.alert('خطأ', msg);
    },
  });

  const handleDeliver = (orderId: string) => {
    if (advancing.current || deliverMutation.isPending) return;
    advancing.current = true;

    const confirm = () => deliverMutation.mutate(orderId);
    const cancel = () => { advancing.current = false; };

    if (Platform.OS === 'web') {
      if (window.confirm('هل أنت متأكد أن الطلب وصل للزبون؟')) { confirm(); } else { cancel(); }
      return;
    }
    Alert.alert('تأكيد التسليم', 'هل أنت متأكد أن الطلب وصل للزبون؟', [
      { text: 'إلغاء', style: 'cancel', onPress: cancel },
      { text: 'نعم، تم التسليم', onPress: confirm },
    ]);
  };

  const handleCall = (phone: string | undefined) => {
    if (!phone) { Alert.alert('خطأ', 'رقم الهاتف غير متوفر'); return; }
    Linking.openURL(`tel:${phone}`);
  };

  const handlePickedUp = () => {
    if (advancing.current) return;
    advancing.current = true;
    setStep(1);
    requestAnimationFrame(() => { advancing.current = false; });
  };

  const allDelivered = batchOrders.length > 0 && batchOrders.every(
    (o: any) => o.status === 'DELIVERED' || deliveredIds.has(o.id),
  );

  useEffect(() => {
    if (!allDelivered) return;
    queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
    Alert.alert('نجاح 🎉', 'تم توصيل جميع الطلبات بنجاح!');
    router.replace('/(tabs)');
  }, [allDelivered]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!batchOrders.length) {
    return (
      <View style={styles.centered}>
        <Text style={{ fontSize: fontSizes.base, color: colors.textMuted, textAlign: 'center' }}>
          لم يتم العثور على تفاصيل هذا الطلب.
        </Text>
        <Button title="العودة للرئيسية" style={{ marginTop: spacing[4] }} onPress={() => router.replace('/(tabs)')} />
      </View>
    );
  }

  const isBatch = batchOrders.length > 1;
  const first = batchOrders[0] as any;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Modal visible={deliverMutation.isPending} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.overlayText}>جاري تأكيد التسليم...</Text>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: spacing[10] }}>
        {/* Stepper */}
        <View style={styles.stepper}>
          {STEPS.map((s, i) => (
            <View key={s} style={styles.stepItem}>
              <View style={[styles.stepDot, i <= step && styles.stepDotActive]}>
                <Text style={[styles.stepNum, i <= step && { color: '#fff' }]}>{i + 1}</Text>
              </View>
              <Text style={styles.stepLabel}>{s}</Text>
            </View>
          ))}
        </View>

        {/* Business pickup info — always visible */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 نقطة الاستلام — المنشأة</Text>
          <Text style={styles.nameText}>{first.business?.name}</Text>
          <Text style={styles.muted}>{first.business?.area?.city} - {first.business?.area?.name}</Text>
          {first.business?.owner?.phone ? (
            <Pressable style={styles.callBtn} onPress={() => handleCall(first.business?.owner?.phone)}>
              <Text style={styles.callText}>📞 اتصال بالمنشأة</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Step 0: show order summary while heading to business */}
        {step === 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {isBatch ? `📦 ${batchOrders.length} طلبات جاهزة للاستلام` : '📦 تفاصيل الطلب'}
            </Text>
            {batchOrders.map((order: any, idx: number) => (
              <View key={order.id} style={idx > 0 ? { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing[3], paddingTop: spacing[3] } : {}}>
                {isBatch && (
                  <Text style={styles.orderIndexText}>الطلب {idx + 1}: {order.customer?.name || 'زبون'}</Text>
                )}
                <Text style={styles.muted}>
                  {order.deliveryAreaName || order.customer?.area?.name || 'العنوان المسجل'}
                  {order.deliveryAddressDetail ? ` — ${order.deliveryAddressDetail}` : ''}
                </Text>
                <View style={{ marginTop: spacing[1] }}>
                  {order.items?.map((it: any) => (
                    <Text key={it.id} style={styles.muted}>• x{it.quantity} {it.product?.name}</Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Step 1: per-order delivery cards */}
        {step === 1 && batchOrders.map((order: any, idx: number) => {
          const isDelivered = order.status === 'DELIVERED' || deliveredIds.has(order.id);
          const isCash = order.paymentMethod === 'CASH';

          return (
            <View key={order.id} style={[styles.card, isDelivered && styles.cardDelivered]}>
              {isBatch && (
                <View style={styles.orderIndexRow}>
                  <Text style={styles.orderIndexText}>الطلب {idx + 1} من {batchOrders.length}</Text>
                  {isDelivered && <Text style={styles.deliveredBadge}>✅ تم التسليم</Text>}
                </View>
              )}

              <Text style={styles.cardTitle}>👤 {order.customer?.name || 'زبون شو عبالك'}</Text>

              <View style={styles.deliveryAddressBlock}>
                <Text style={styles.deliveryAddressLabel}>عنوان التوصيل</Text>
                <Text style={styles.deliveryAreaName}>
                  {order.deliveryAreaName || order.customer?.area?.name || 'المنطقة'}
                </Text>
                {!!order.deliveryAddressDetail && (
                  <Text style={styles.deliveryAddressDetail}>{order.deliveryAddressDetail}</Text>
                )}
              </View>

              {order.customer?.phone ? (
                <Pressable style={styles.callBtn} onPress={() => handleCall(order.customer?.phone)}>
                  <Text style={styles.callText}>📞 اتصال بالزبون</Text>
                </Pressable>
              ) : null}

              <View style={styles.itemsList}>
                {order.items?.map((it: any) => (
                  <View key={it.id} style={styles.itemRow}>
                    <Text style={styles.itemQty}>x{it.quantity}</Text>
                    <Text style={styles.itemName}>{it.product?.name}</Text>
                  </View>
                ))}
              </View>

              {order.note ? (
                <View style={styles.noteContainer}>
                  <Text style={styles.noteTitle}>📝 ملاحظات:</Text>
                  <Text style={styles.noteText}>{order.note}</Text>
                </View>
              ) : null}

              <View style={[styles.cashCallout, !isCash && styles.electronicCallout]}>
                <Text style={[styles.cashText, !isCash && styles.electronicText]}>
                  {isCash
                    ? `💵 استلم ${order.total} ₪ نقداً من الزبون`
                    : `💳 مدفوع إلكترونياً — ${order.total} ₪`}
                </Text>
              </View>

              {!isDelivered && (
                <Button
                  title="تأكيد التسليم ✅"
                  disabled={deliverMutation.isPending}
                  onPress={() => handleDeliver(order.id)}
                  style={{ marginTop: spacing[2] }}
                />
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Footer action */}
      {step === 0 && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing[4]) }]}>
          <Button title="استلمت الطلب من المنشأة 🛵 ابدأ التوصيل" onPress={handlePickedUp} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing[4] },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  overlayCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[6], alignItems: 'center', gap: spacing[3], minWidth: 200 },
  overlayText: { fontFamily: fontFamily.bold, fontSize: fontSizes.base, color: colors.textPrimary, textAlign: 'center' },
  stepper: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border },
  stepItem: { alignItems: 'center', flex: 1, gap: 6 },
  stepDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: colors.primary },
  stepNum: { fontFamily: fontFamily.bold, color: colors.textMuted },
  stepLabel: { fontSize: fontSizes.xs, color: colors.textPrimary, textAlign: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, gap: 4 },
  cardDelivered: { opacity: 0.55, borderColor: '#86EFAC' },
  cardTitle: { fontSize: fontSizes.base, fontFamily: fontFamily.bold, color: colors.textPrimary, textAlign: 'right' },
  nameText: { fontSize: fontSizes.base, fontFamily: fontFamily.extrabold, color: colors.primary, textAlign: 'right', marginVertical: 2 },
  muted: { color: colors.textMuted, fontSize: fontSizes.sm, textAlign: 'right' },
  callBtn: { backgroundColor: colors.secondary, borderRadius: radius.full, paddingHorizontal: spacing[4], paddingVertical: spacing[2], alignSelf: 'flex-start', marginTop: spacing[2] },
  callText: { color: '#fff', fontFamily: fontFamily.bold, fontSize: fontSizes.sm },
  itemsList: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing[2], marginTop: spacing[2], gap: spacing[2] },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontSize: fontSizes.sm, color: colors.textPrimary, textAlign: 'right', flex: 1 },
  itemQty: { fontSize: fontSizes.sm, fontFamily: fontFamily.bold, color: colors.primary },
  noteContainer: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing[3], marginTop: spacing[2] },
  noteTitle: { fontSize: fontSizes.xs, fontFamily: fontFamily.bold, color: colors.textPrimary, textAlign: 'right' },
  noteText: { fontSize: fontSizes.xs, color: colors.textMuted, textAlign: 'right', marginTop: 2 },
  cashCallout: { backgroundColor: '#FEF9C3', borderRadius: radius.md, padding: spacing[3], borderWidth: 1, borderColor: '#FEF08A', marginTop: spacing[2] },
  cashText: { color: '#854D0E', fontFamily: fontFamily.bold, fontSize: fontSizes.sm, textAlign: 'center' },
  electronicCallout: { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' },
  electronicText: { color: '#166534' },
  footer: { padding: spacing[4], backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
  orderIndexRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[1] },
  orderIndexText: { fontFamily: fontFamily.bold, fontSize: fontSizes.sm, color: colors.primary },
  deliveredBadge: { fontFamily: fontFamily.bold, fontSize: fontSizes.sm, color: '#16A34A' },
  deliveryAddressBlock: { backgroundColor: colors.primary + '0D', borderRadius: radius.md, padding: spacing[3], marginVertical: spacing[2], borderWidth: 1, borderColor: colors.primary + '30' },
  deliveryAddressLabel: { fontFamily: fontFamily.semibold, fontSize: fontSizes.xs, color: colors.primary, textAlign: 'right', marginBottom: 4 },
  deliveryAreaName: { fontFamily: fontFamily.bold, fontSize: fontSizes.base, color: colors.textPrimary, textAlign: 'right' },
  deliveryAddressDetail: { fontFamily: fontFamily.regular, fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'right', marginTop: 2 },
});
