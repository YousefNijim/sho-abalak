'use client';

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, fontSizes, radius, spacing } from '../../src/theme';
import { businessesApi, ordersApi } from '@shu/api-client';

const TABS = [
  { key: 'new', label: 'جديد' },
  { key: 'active', label: 'جاري' },
  { key: 'done', label: 'منتهي' },
] as const;

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'new' | 'active' | 'done'>('new');

  // Fetch business profile owned by the logged-in user
  const { data: business, isLoading: loadingBusiness } = useQuery({
    queryKey: ['business-mine'],
    queryFn: () => businessesApi.mine(),
  });

  // Fetch all orders for this business
  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['business-orders'],
    queryFn: () => ordersApi.list(),
    refetchInterval: 5000, // Poll every 5 seconds for new orders
  });

  // Mutation to toggle open/close status
  const toggleOpen = useMutation({
    mutationFn: (isOpen: boolean) =>
      businessesApi.update(business!.id, { isOpen }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-mine'] });
    },
  });

  const handleToggle = (val: boolean) => {
    if (business) {
      toggleOpen.mutate(val);
    }
  };

  const newOrders = orders.filter((o: any) => o.status === 'PENDING');
  const activeOrders = orders.filter((o: any) =>
    ['CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP'].includes(o.status),
  );
  const doneOrders = orders.filter((o: any) =>
    ['DELIVERED', 'CANCELLED'].includes(o.status),
  );

  const list = tab === 'new' ? newOrders : tab === 'active' ? activeOrders : doneOrders;

  // Compute live dashboard stats
  const todayOrders = orders.filter((o: any) => {
    try {
      const d = new Date(o.createdAt);
      const today = new Date();
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    } catch {
      return false;
    }
  });

  const revenue = todayOrders
    .filter((o: any) => o.status === 'DELIVERED')
    .reduce((acc: number, o: any) => acc + o.total, 0);

  const preparingCount = orders.filter((o: any) =>
    ['CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP'].includes(o.status),
  ).length;

  const completedCount = orders.filter((o: any) => o.status === 'DELIVERED').length;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  if (loadingBusiness || loadingOrders) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isOpen = business?.isOpen ?? false;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={styles.storeName}>{business?.name || 'المنشأة التجارية'}</Text>
          <Text style={[styles.status, { color: isOpen ? colors.success : colors.error }]}>
            {isOpen ? '🟢 مفتوح حالياً' : '🔴 مغلق حالياً'}
          </Text>
        </View>
        <Switch
          value={isOpen}
          onValueChange={handleToggle}
          trackColor={{ true: colors.primary }}
          disabled={toggleOpen.isPending}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing[4], paddingBottom: 24 }}>
        {/* Stats */}
        <View style={styles.statsGrid}>
          <Stat label="طلبات اليوم" value={String(todayOrders.length)} bg={colors.primary} />
          <Stat label="إيرادات اليوم" value={`₪${revenue}`} bg={colors.secondary} />
          <Stat label="قيد التحضير" value={String(preparingCount)} bg={colors.primary} />
          <Stat label="الطلبات المكتملة" value={String(completedCount)} bg={colors.secondary} />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((t) => (
            <Pressable key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
              {t.key === 'new' && newOrders.length > 0 ? <View style={styles.redDot} /> : null}
            </Pressable>
          ))}
        </View>

        {/* Orders */}
        <View style={{ gap: spacing[3] }}>
          {list.map((o: any) => {
            const itemsCount = o.items?.reduce((acc: number, it: any) => acc + it.quantity, 0) ?? 0;
            return (
              <Pressable key={o.id} style={styles.orderCard} onPress={() => router.push(`/order/${o.id}`)}>
                <View style={styles.orderRow}>
                  <Text style={styles.orderId}>طلب #{o.id.slice(-6).toUpperCase()}</Text>
                  <Text style={styles.muted}>{formatDate(o.createdAt)}</Text>
                </View>
                <Text style={styles.customer}>{o.customer?.name || 'زبون منصة شو عبالك'}</Text>
                <View style={styles.orderRow}>
                  <Text style={styles.muted}>{itemsCount} عناصر · {o.paymentMethod === 'CASH' ? 'نقدي' : 'إلكتروني'}</Text>
                  <Text style={styles.total}>{o.total} ₪</Text>
                </View>
              </Pressable>
            );
          })}
          {list.length === 0 ? <Text style={styles.empty}>لا توجد طلبات في هذا القسم</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, bg }: { label: string; value: string; bg: string }) {
  return (
    <View style={[styles.stat, { backgroundColor: bg }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: spacing[4], backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  storeName: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.textPrimary, textAlign: 'right' },
  status: { fontSize: fontSizes.sm, marginTop: 2, fontWeight: '600', textAlign: 'right' },
  statsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing[3], marginBottom: spacing[5] },
  stat: { width: '47%', borderRadius: radius.lg, padding: spacing[4], flexGrow: 1, alignItems: 'flex-end' },
  statValue: { color: '#fff', fontSize: 24, fontWeight: '800' },
  statLabel: { color: '#fff', fontSize: fontSizes.sm, opacity: 0.9, marginTop: 2 },
  tabs: { flexDirection: 'row-reverse', gap: spacing[2], marginBottom: spacing[4] },
  tab: { flex: 1, paddingVertical: spacing[3], borderRadius: radius.md, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  redDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  orderCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, gap: 4 },
  orderRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontWeight: '700', color: colors.textPrimary, fontSize: fontSizes.base },
  customer: { color: colors.textPrimary, fontSize: fontSizes.base, textAlign: 'right' },
  muted: { color: colors.textMuted, fontSize: fontSizes.sm },
  total: { color: colors.primary, fontWeight: '700', fontSize: fontSizes.base },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing[10] },
});
