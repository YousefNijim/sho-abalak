import { useEffect } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { colors, fontSizes, fontFamily, radius, spacing } from '../src/theme';
import { Button } from '@shu/ui-components/native';
import { ordersApi } from '@shu/api-client';
import { useSocket } from '../src/hooks/useSocket';

const STEPS = [
  { status: 'PENDING', label: 'تم استلام الطلب' },
  { status: 'CONFIRMED', label: 'تم تأكيد المنشأة' },
  { status: 'PREPARING', label: 'جاري تحضير الطلب' },
  { status: 'PICKED_UP', label: 'في الطريق إليك' },
  { status: 'DELIVERED', label: 'تم التسليم' },
] as const;

export default function Tracking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const socket = useSocket();

  // Poll order status every 30 seconds as a heartbeat fallback; sockets handle instant updates
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(id!),
    enabled: !!id,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!socket || !id) return;

    const handleStatusUpdate = (payload: { orderId: string; status: string }) => {
      if (payload.orderId === id) {
        console.log(`WS instant order status update received: ${payload.status}`);
        queryClient.invalidateQueries({ queryKey: ['order', id] });
      }
    };

    socket.on('order:status_update', handleStatusUpdate);

    return () => {
      socket.off('order:status_update', handleStatusUpdate);
    };
  }, [socket, id, queryClient]);

  if (!id) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing[6] }}>
        <Text style={{ fontSize: 64, marginBottom: spacing[4] }}>📍</Text>
        <Text style={{ fontSize: fontSizes.xl, fontFamily: fontFamily.bold, color: colors.textPrimary, marginBottom: spacing[2] }}>لا يوجد طلب لتتبعه</Text>
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginBottom: spacing[6] }}>تصفح طلباتك السابقة لمتابعة حالة أي طلب نشط.</Text>
        <Button title="الذهاب للطلبات" onPress={() => router.replace('/(tabs)/orders')} />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing[6] }}>
        <Text style={{ color: colors.error, fontSize: fontSizes.lg, fontFamily: fontFamily.bold, marginBottom: spacing[4] }}>فشل تحميل تفاصيل الطلب</Text>
        <Button title="تحديث" onPress={() => router.replace('/(tabs)')} />
      </View>
    );
  }

  // Get current status index
  const getStatusIndex = (status: string) => {
    switch (status) {
      case 'PENDING': return 0;
      case 'CONFIRMED': return 1;
      case 'PREPARING':
      case 'READY': return 2;
      case 'PICKED_UP': return 3;
      case 'DELIVERED': return 4;
      default: return -1;
    }
  };

  const currentIdx = getStatusIndex(order.status);
  const isCancelled = order.status === 'CANCELLED';

  const handleCallDriver = () => {
    if (order.driver?.user?.phone) {
      Linking.openURL(`tel:${order.driver.user.phone}`);
    } else {
      Alert.alert('تنبيه', 'رقم السائق غير متوفر');
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing[4] }}>
      <Text style={styles.heading}>طلبك من {order.business?.name || 'المنشأة'}</Text>
      <Text style={styles.eta}>
        {isCancelled
          ? 'تم إلغاء هذا الطلب'
          : order.status === 'DELIVERED'
          ? 'تم تسليم الطلب بنجاح!'
          : 'وقت التوصيل المتوقع: 25-35 دقيقة'}
      </Text>

      {/* Cancelled Banner */}
      {isCancelled && (
        <View style={styles.cancelledBanner}>
          <Text style={styles.cancelledText}>❌ هذا الطلب تم إلغاؤه.</Text>
        </View>
      )}

      {/* Stepper */}
      {!isCancelled && (
        <View style={styles.stepper}>
          {STEPS.map((s, i) => {
            const stepIdx = i;
            let state: 'done' | 'active' | 'pending' = 'pending';
            if (currentIdx > stepIdx) {
              state = 'done';
            } else if (currentIdx === stepIdx) {
              state = 'active';
            }

            const color = state === 'done' ? colors.secondary : state === 'active' ? colors.primary : colors.border;
            return (
              <View key={s.status} style={styles.step}>
                <View style={styles.stepLeft}>
                  <View style={[styles.dot, { backgroundColor: color }]}>
                    <Text style={styles.dotText}>{state === 'done' ? '✓' : state === 'active' ? '●' : ''}</Text>
                  </View>
                  {i < STEPS.length - 1 ? (
                    <View style={[styles.line, { backgroundColor: state === 'done' ? colors.secondary : colors.border }]} />
                  ) : null}
                </View>
                <Text style={[styles.stepLabel, state === 'pending' && { color: colors.textMuted }]}>{s.label}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Driver Info */}
      {!isCancelled && order.status !== 'PENDING' && order.status !== 'CONFIRMED' && (
        <View style={styles.driver}>
          <View style={styles.driverAvatar}><Text style={{ fontSize: 28 }}>🛵</Text></View>
          {order.driver ? (
            <>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName}>{order.driver.user?.name || 'سائق منصة شو عبالك'}</Text>
                <Text style={styles.muted}>سائق التوصيل · {order.driver.user?.phone || ''}</Text>
              </View>
              <Pressable style={styles.callBtn} onPress={handleCallDriver}>
                <Text style={styles.callText}>📞 اتصال</Text>
              </Pressable>
            </>
          ) : (
            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>جاري تعيين سائق...</Text>
              <Text style={styles.muted}>سنقوم بإعلامك فور انطلاق السائق.</Text>
            </View>
          )}
        </View>
      )}

      <View style={{ marginTop: spacing[6], gap: spacing[2] }}>
        <Text style={styles.detailTitle}>تفاصيل الطلب:</Text>
        {order.items?.map((it: any) => (
          <View key={it.id} style={styles.itemRow}>
            <Text style={styles.itemName}>{it.product?.name} (x{it.quantity})</Text>
            <Text style={styles.itemPrice}>{it.unitPrice * it.quantity} ₪</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.itemRow}>
          <Text style={styles.totalLabel}>الإجمالي مع التوصيل:</Text>
          <Text style={styles.totalValue}>{order.total} ₪</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: fontSizes.xl, fontFamily: fontFamily.bold, color: colors.textPrimary, textAlign: 'right' },
  eta: { color: colors.textMuted, marginTop: 4, marginBottom: spacing[6], textAlign: 'right' },
  cancelledBanner: { backgroundColor: '#FEE2E2', borderRadius: radius.md, padding: spacing[4], marginBottom: spacing[6] },
  cancelledText: { color: '#991B1B', fontFamily: fontFamily.bold, fontSize: fontSizes.base, textAlign: 'right' },
  stepper: { gap: 0, alignItems: 'flex-start' },
  step: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: spacing[3], width: '100%' },
  stepLeft: { alignItems: 'center' },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dotText: { color: '#fff', fontSize: 14, fontFamily: fontFamily.bold },
  line: { width: 2, height: 32 },
  stepLabel: { fontSize: fontSizes.base, color: colors.textPrimary, fontFamily: fontFamily.semibold, paddingTop: 4, flex: 1, textAlign: 'right' },
  driver: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing[3], backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, marginTop: spacing[6] },
  driverAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  driverName: { fontSize: fontSizes.base, fontFamily: fontFamily.bold, color: colors.textPrimary, textAlign: 'right' },
  muted: { color: colors.textMuted, fontSize: fontSizes.sm, textAlign: 'right' },
  callBtn: { backgroundColor: colors.secondary, borderRadius: radius.full, paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  callText: { color: '#fff', fontFamily: fontFamily.bold },
  detailTitle: { fontSize: fontSizes.base, fontFamily: fontFamily.bold, color: colors.textPrimary, textAlign: 'right', marginBottom: spacing[2] },
  itemRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 4 },
  itemName: { color: colors.textPrimary, fontSize: fontSizes.sm },
  itemPrice: { color: colors.textPrimary, fontSize: fontSizes.sm, fontFamily: fontFamily.semibold },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing[2] },
  totalLabel: { fontSize: fontSizes.base, fontFamily: fontFamily.bold, color: colors.textPrimary },
  totalValue: { fontSize: fontSizes.base, fontFamily: fontFamily.bold, color: colors.primary },
});
