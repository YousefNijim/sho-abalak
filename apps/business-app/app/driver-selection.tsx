import { useState, useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, AppState, AppStateStatus, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@shu/ui-components/native';
import { colors, fontSizes, fontFamily, radius, spacing } from '../src/theme';
import { businessesApi, driversApi, ordersApi } from '@shu/api-client';
import { useSocket } from '../src/hooks/useSocket';

export default function DriverSelection() {
  const router = useRouter();
  const queryClient = useQueryClient();
  // Accept both single orderId (legacy) and comma-separated orderIds (batch)
  const params = useLocalSearchParams<{ orderId?: string; orderIds?: string }>();

  const orderIds: string[] = params.orderIds
    ? params.orderIds.split(',').filter(Boolean)
    : params.orderId
    ? [params.orderId]
    : [];

  const isBatch = orderIds.length > 1;

  const [filter, setFilter] = useState<'mine' | 'all'>('mine');
  const [pendingDriverId, setPendingDriverId] = useState<string | null>(null);

  const { data: business } = useQuery({
    queryKey: ['business-mine'],
    queryFn: () => businessesApi.mine(),
  });

  const areaId = business?.areaId;

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['available-drivers', filter, areaId],
    queryFn: () => driversApi.available(filter === 'mine' ? areaId : undefined),
    enabled: !!business,
  });

  const sendRequest = useMutation({
    mutationFn: (driverId: string) => ordersApi.sendDriverRequest(orderIds, driverId),
    onSuccess: (_, driverId) => {
      setPendingDriverId(driverId);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'فشل إرسال الطلب للسائق.';
      Alert.alert('خطأ', msg);
    },
  });

  const socket = useSocket();
  const appStateRef = useRef(AppState.currentState);

  // Refetch when app returns to foreground
  useEffect(() => {
    if (!orderIds.length || !pendingDriverId) return;
    const primaryId = orderIds[0];
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active') {
        ordersApi.getById(primaryId).then((order) => {
          if (order.status !== 'READY') {
            queryClient.invalidateQueries({ queryKey: ['business-orders'] });
            router.replace(`/order/${primaryId}`);
          }
        }).catch(() => {});
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [orderIds.join(','), pendingDriverId, queryClient, router]);

  useEffect(() => {
    if (!socket || !orderIds.length) return;

    const handleStatusUpdate = (payload: { orderId: string; status: string }) => {
      if (orderIds.includes(payload.orderId) && payload.status !== 'READY') {
        queryClient.invalidateQueries({ queryKey: ['business-orders'] });
        router.replace(`/order/${payload.orderId}`);
      }
    };

    const handleDriverRejected = (payload: { orderId: string; driverName: string }) => {
      if (orderIds.includes(payload.orderId)) {
        setPendingDriverId(null);
        queryClient.invalidateQueries({ queryKey: ['available-drivers', filter, areaId] });
        Alert.alert('تم رفض الطلب', `اعتذر السائق ${payload.driverName} عن التوصيل. الرجاء اختيار سائق آخر.`);
      }
    };

    socket.on('order:status_update', handleStatusUpdate);
    socket.on('order:driver_rejected', handleDriverRejected);
    return () => {
      socket.off('order:status_update', handleStatusUpdate);
      socket.off('order:driver_rejected', handleDriverRejected);
    };
  }, [socket, orderIds.join(','), filter, areaId, queryClient, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (pendingDriverId) {
    const pendingDriver = drivers.find((d: any) => d.id === pendingDriverId);
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing[5] }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.pendingTitle}>تم إرسال {isBatch ? `${orderIds.length} طلبات` : 'الطلب'} للسائق</Text>
        <Text style={styles.pendingName}>{pendingDriver?.user?.name || 'السائق'}</Text>
        <Text style={styles.pendingSubtitle}>بانتظار القبول...</Text>
        <Button
          title="إلغاء واختيار سائق آخر"
          variant="secondary"
          style={{ marginTop: spacing[6], width: '100%' }}
          onPress={() => setPendingDriverId(null)}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Batch summary banner */}
      {isBatch && (
        <View style={styles.batchBanner}>
          <Text style={styles.batchBannerText}>📦 سيتم إرسال {orderIds.length} طلبات لنفس السائق</Text>
        </View>
      )}

      <View style={styles.filters}>
        {[
          { key: 'mine', label: 'منطقتي فقط' },
          { key: 'all', label: 'الكل المتاحين' },
        ].map((f) => (
          <Pressable
            key={f.key}
            style={[styles.filter, filter === f.key && styles.filterActive]}
            onPress={() => setFilter(f.key as 'mine' | 'all')}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[3] }}>
        {drivers.length === 0 ? (
          <Text style={styles.empty}>لا يوجد سائقون متاحون حالياً في هذه المنطقة</Text>
        ) : (
          drivers.map((d: any) => (
            <View key={d.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.avatar}><Text style={{ fontSize: 24 }}>🛵</Text></View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={styles.name}>{d.user?.name || 'سائق منصة شو عبالك'}</Text>
                  <Text style={styles.muted}>{d.area?.city} - {d.area?.name}</Text>
                  <Text style={styles.muted}>⭐ {d.rating ? d.rating.toFixed(1) : '5.0'}</Text>
                </View>
                <View style={styles.availTag}><Text style={styles.availText}>نشط</Text></View>
              </View>
              <Button
                title={sendRequest.isPending && sendRequest.variables === d.id ? 'جاري الإرسال...' : `إرسال ${isBatch ? `${orderIds.length} طلبات` : 'الطلب'} للسائق`}
                onPress={() => sendRequest.mutate(d.id)}
                disabled={sendRequest.isPending}
                style={{ marginTop: spacing[3] }}
              />
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  batchBanner: { backgroundColor: colors.primary + '15', padding: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.primary + '30' },
  batchBannerText: { color: colors.primary, fontFamily: fontFamily.bold, fontSize: fontSizes.sm, textAlign: 'center' },
  filters: { flexDirection: 'row', gap: spacing[2], padding: spacing[4] },
  filter: { flex: 1, paddingVertical: spacing[3], borderRadius: radius.md, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.textMuted, fontFamily: fontFamily.semibold },
  filterTextActive: { color: '#fff' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: fontSizes.base, fontFamily: fontFamily.bold, color: colors.textPrimary },
  muted: { color: colors.textMuted, fontSize: fontSizes.sm },
  availTag: { backgroundColor: '#DCFCE7', borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: 4 },
  availText: { color: '#166534', fontFamily: fontFamily.bold, fontSize: fontSizes.sm },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing[12] },
  pendingTitle: { fontSize: fontSizes.xl, fontFamily: fontFamily.bold, color: colors.textPrimary, marginTop: spacing[5], textAlign: 'center' },
  pendingName: { fontSize: fontSizes.lg, fontFamily: fontFamily.extrabold, color: colors.primary, marginTop: spacing[2], textAlign: 'center' },
  pendingSubtitle: { fontSize: fontSizes.base, color: colors.textMuted, marginTop: spacing[2], textAlign: 'center' },
});
