'use client';

import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, fontSizes, radius, spacing } from '../../src/theme';
import { driversApi, ordersApi } from '@shu/api-client';

export default function DriverHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  // Fetch driver profile
  const { data: driver, isLoading: loadingMe } = useQuery({
    queryKey: ['driver-me'],
    queryFn: () => driversApi.me(),
  });

  // Fetch all orders scoped to this driver
  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['driver-orders'],
    queryFn: () => ordersApi.list(),
    refetchInterval: 5000, // Poll every 5s
  });

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
  const activeOrder = orders.find((o: any) => ['READY', 'PICKED_UP'].includes(o.status));

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

  const earnings = completedToday.reduce((acc: number, o: any) => {
    // Driver gets the delivery fee portion
    return acc + (o.business?.area?.deliveryFee ?? 5);
  }, 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + 8, padding: spacing[4], gap: spacing[5] }}
    >
      <Text style={styles.greeting}>مرحباً {driver?.user?.name || 'كريم'} 👋</Text>

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

      {/* Current order */}
      <View>
        <Text style={styles.sectionTitle}>الطلب الحالي النشط</Text>
        {activeOrder ? (
          <Pressable
            style={styles.orderCard}
            onPress={() =>
              router.push({
                pathname: '/active-delivery',
                params: { orderId: activeOrder.id },
              })
            }
          >
            <View style={styles.orderRow}>
              <Text style={styles.amount}>{activeOrder.total} ₪</Text>
              <Text style={styles.orderTitle}>{activeOrder.business?.name || 'المنشأة التجارية'}</Text>
            </View>
            <Text style={styles.muted}>إلى: {activeOrder.customer?.area?.name || 'العنوان المسجل'}</Text>
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

      {/* Simulate incoming request */}
      <Pressable style={styles.simulate} onPress={() => router.push('/request-alert')}>
        <Text style={styles.simulateText}>🔔 محاكاة طلب جديد وارد</Text>
      </Pressable>
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
  greeting: { fontSize: fontSizes['2xl'], fontWeight: '800', color: colors.primary, textAlign: 'right' },
  availCard: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border },
  availStatus: { fontSize: fontSizes.lg, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: fontSizes.sm, marginTop: 2 },
  stats: { flexDirection: 'row-reverse', gap: spacing[3] },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  statValue: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.textPrimary },
  statLabel: { color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 },
  sectionTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing[3], textAlign: 'right' },
  orderCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, gap: 4 },
  orderRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  orderTitle: { fontSize: fontSizes.base, fontWeight: '700', color: colors.textPrimary },
  amount: { color: colors.primary, fontWeight: '700' },
  deliverBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing[3], alignItems: 'center', marginTop: spacing[3] },
  deliverText: { color: '#fff', fontWeight: '700' },
  simulate: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.md, padding: spacing[4], alignItems: 'center' },
  simulateText: { color: colors.primary, fontWeight: '700' },
  emptyCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[6], borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: fontSizes.sm },
});
