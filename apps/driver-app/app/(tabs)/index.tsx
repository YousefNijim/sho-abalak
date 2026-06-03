import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';
import { driversApi, ordersApi } from '@shu/api-client';
import { useSocket } from '../../src/hooks/useSocket';
import { NotificationBell } from '../../src/components/NotificationBell';

export default function DriverHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const socket = useSocket();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch driver profile
  const { data: driver, isLoading: loadingMe } = useQuery({
    queryKey: ['driver-me'],
    queryFn: () => driversApi.me(),
  });

  // Fetch all orders scoped to this driver - poll every 30 seconds as fallback heartbeat
  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['driver-orders'],
    queryFn: () => ordersApi.list(),
    refetchInterval: 30000,
  });

  // driver:request is handled globally in _layout.tsx (GlobalSocketListener) to ensure
  // it fires regardless of which tab is active. Only listen here for order status changes
  // that need to refresh the home screen's order list.
  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = (payload: { orderId: string; status: string }) => {
      queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
    };

    socket.on('order:status_update', handleStatusUpdate);

    return () => {
      socket.off('order:status_update', handleStatusUpdate);
    };
  }, [socket, queryClient]);

  // Mutation to toggle availability
  const toggleAvailable = useMutation({
    mutationFn: (status: 'AVAILABLE' | 'OFFLINE') =>
      driversApi.updateMyStatus({ status, areaId: driver?.areaId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-me'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'فشل تحديث حالة السائق.';
      Alert.alert('خطأ', msg);
    },
  });

  const handleToggle = (val: boolean) => {
    if (driver) {
      toggleAvailable.mutate(val ? 'AVAILABLE' : 'OFFLINE');
    }
  };

  if (loadingMe || loadingOrders) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isAvailable = driver?.status === 'AVAILABLE';
  // Orders sent to this driver but not yet accepted (pendingDriverId set, driverId null)
  const pendingOrders = Array.isArray(orders)
    ? orders.filter((o: any) => o.status === 'READY' && o.driverId == null)
    : [];
  // Orders currently in-progress (accepted)
  const activeOrders = Array.isArray(orders)
    ? orders.filter((o: any) => ['READY', 'PICKED_UP'].includes(o.status) && o.driverId != null)
    : [];
  const activeOrder = activeOrders[0] ?? null;
  // If all active orders share a batchId, use it so active-delivery loads the full batch
  const activeBatchId = activeOrders.length > 0 && activeOrders[0].batchId
    && activeOrders.every((o: any) => o.batchId === activeOrders[0].batchId)
    ? activeOrders[0].batchId
    : null;

  // Compute live today's stats
  const completedToday = orders.filter((o: any) => {
    try {
      const d = new Date(o.createdAt);
      const today = new Date();
      return (
        o.status === 'DELIVERED' &&
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    } catch {
      return false;
    }
  });

  const earnings = Math.round(completedToday.reduce((acc: number, o: any) => {
    // Driver gets the delivery fee portion
    return acc + Number(o.business?.area?.deliveryFee ?? 5);
  }, 0) * 100) / 100;

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['driver-me'] }),
      queryClient.invalidateQueries({ queryKey: ['driver-orders'] })
    ]);
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + 8, padding: spacing[4], gap: spacing[5] }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={styles.greeting}>مرحباً {driver?.user?.name || 'كريم'} 👋</Text>
        <NotificationBell size={24} />
      </View>

      {/* Availability */}
      <View style={styles.availCard}>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.availStatus, { color: isAvailable ? colors.success : colors.error }]}>
            {isAvailable ? '🟢 متاح للتوصيل' : '🔴 غير متصل حالياً'}
          </Text>
          <Text style={styles.muted}>
            المنطقة: {driver?.area?.city} - {driver?.area?.name}
          </Text>
        </View>
        <Switch
          value={isAvailable}
          onValueChange={handleToggle}
          trackColor={{ true: colors.primary }}
          disabled={toggleAvailable.isPending}
        />
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <Stat label="توصيلات اليوم" value={String(completedToday.length)} />
        <Stat label="أرباح اليوم" value={`₪${earnings}`} />
        <Stat label="تقييمي العام" value={driver?.rating ? driver.rating.toFixed(1) : '5.0'} />
      </View>

      {/* New pending orders — sent by business, awaiting driver acceptance */}
      {pendingOrders.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>طلبات جديدة 🔔</Text>
          <View style={{ gap: spacing[3] }}>
            {pendingOrders.map((o: any) => (
              <Pressable
                key={o.id}
                style={[styles.orderCard, styles.pendingCard]}
                onPress={() =>
                  router.push({
                    pathname: '/request-alert',
                    params: {
                      batchId: o.batchId ?? o.id,
                      ordersJson: JSON.stringify([{
                        orderId: o.id,
                        businessName: o.business?.name || 'منشأة تجارية',
                        areaName: o.deliveryAreaName || o.customer?.area?.name || 'العنوان المسجل',
                        addressDetail: o.deliveryAddressDetail || '',
                        total: Number(o.total),
                        items: (o.items || []).map((it: any) => ({ name: it.product?.name || '', quantity: it.quantity })),
                      }]),
                    },
                  })
                }
              >
                <View style={styles.orderRow}>
                  <Text style={styles.amount}>{o.total} ₪</Text>
                  <Text style={styles.orderTitle}>{o.business?.name || 'المنشأة التجارية'}</Text>
                </View>
                <Text style={styles.muted}>
                  إلى: {o.deliveryAreaName || o.customer?.area?.name || 'العنوان المسجل'}
                </Text>
                <View style={[styles.deliverBtn, { backgroundColor: colors.secondary }]}>
                  <Text style={styles.deliverText}>عرض الطلب والرد عليه</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Current order */}
      <View>
        <Text style={styles.sectionTitle}>الطلب الحالي النشط</Text>
        {activeOrder ? (
          <Pressable
            style={styles.orderCard}
            onPress={() =>
              router.push({
                pathname: '/active-delivery',
                params: {
                  primaryOrderId: activeOrder.id,
                  ...(activeBatchId ? { batchId: activeBatchId } : {}),
                },
              })
            }
          >
            <View style={styles.orderRow}>
              <Text style={styles.amount}>
                {activeOrders.length > 1
                  ? `${activeOrders.reduce((s: number, o: any) => s + Number(o.total), 0)} ₪`
                  : `${activeOrder.total} ₪`}
              </Text>
              <Text style={styles.orderTitle}>
                {activeOrders.length > 1
                  ? `${activeOrders.length} طلبات — ${activeOrder.business?.name || 'المنشأة التجارية'}`
                  : activeOrder.business?.name || 'المنشأة التجارية'}
              </Text>
            </View>
            <Text style={styles.muted}>
              {activeOrders.length > 1
                ? `${activeOrders.length} عناوين توصيل`
                : `إلى: ${activeOrder.customer?.area?.name || 'العنوان المسجل'}`}
            </Text>
            <View style={styles.deliverBtn}>
              <Text style={styles.deliverText}>عرض تفاصيل التوصيل</Text>
            </View>
          </Pressable>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>لا توجد طلبات توصيل نشطة حالياً</Text>
          </View>
        )}
      </View>


    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  greeting: { fontSize: fontSizes['2xl'], fontFamily: fontFamily.extrabold, color: colors.primary, textAlign: 'right' },
  availCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border },
  availStatus: { fontSize: fontSizes.lg, fontFamily: fontFamily.bold },
  muted: { color: colors.textMuted, fontSize: fontSizes.sm, marginTop: 2 },
  stats: { flexDirection: 'row', gap: spacing[3] },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  statValue: { fontSize: fontSizes.xl, fontFamily: fontFamily.extrabold, color: colors.textPrimary },
  statLabel: { color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 },
  sectionTitle: { fontSize: fontSizes.lg, fontFamily: fontFamily.bold, color: colors.textPrimary, marginBottom: spacing[3], textAlign: 'right' },
  orderCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, gap: 4 },
  pendingCard: { borderColor: colors.secondary, borderWidth: 2 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderTitle: { fontSize: fontSizes.base, fontFamily: fontFamily.bold, color: colors.textPrimary },
  amount: { color: colors.primary, fontFamily: fontFamily.bold },
  deliverBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing[3], alignItems: 'center', marginTop: spacing[3] },
  deliverText: { color: '#fff', fontFamily: fontFamily.bold },
  simulate: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.md, padding: spacing[4], alignItems: 'center' },
  simulateText: { color: colors.primary, fontFamily: fontFamily.bold },
  emptyCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[6], borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: fontSizes.sm },
});
