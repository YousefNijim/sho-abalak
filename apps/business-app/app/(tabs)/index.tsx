import { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';
import { businessesApi, ordersApi } from '@shu/api-client';
import { useSocket } from '../../src/hooks/useSocket';
import { NotificationBell } from '../../src/components/NotificationBell';

const TABS = [
  { key: 'new', label: 'جديد' },
  { key: 'active', label: 'جاري' },
  { key: 'done', label: 'منتهي' },
] as const;

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const socket = useSocket();
  const [tab, setTab] = useState<'new' | 'active' | 'done'>('new');
  const [refreshing, setRefreshing] = useState(false);

  // Batch selection state — only relevant on the "active" tab for READY orders
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: business, isLoading: loadingBusiness } = useQuery({
    queryKey: ['business-mine'],
    queryFn: () => businessesApi.mine(),
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['business-orders'],
    queryFn: () => ordersApi.list(),
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!socket) return;

    const handleNewOrder = (payload: { order: any }) => {
      Alert.alert('طلب جديد! 🔔', `تلقيت طلباً جديداً بقيمة ${payload.order.total} ₪`);
      queryClient.invalidateQueries({ queryKey: ['business-orders'] });
    };

    const handleStatusUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['business-orders'] });
    };

    const handleDriverRejected = (payload: { orderId: string; driverName: string }) => {
      Alert.alert('سائق غير متاح', `اعتذر السائق ${payload.driverName} عن توصيل الطلب. يرجى تعيين سائق آخر.`);
      queryClient.invalidateQueries({ queryKey: ['business-orders'] });
    };

    socket.on('order:new', handleNewOrder);
    socket.on('order:status_update', handleStatusUpdate);
    socket.on('order:driver_rejected', handleDriverRejected);
    return () => {
      socket.off('order:new', handleNewOrder);
      socket.off('order:status_update', handleStatusUpdate);
      socket.off('order:driver_rejected', handleDriverRejected);
    };
  }, [socket, queryClient]);

  // Exit select mode whenever tab changes
  useEffect(() => {
    setSelectMode(false);
    setSelectedIds([]);
  }, [tab]);

  const toggleOpen = useMutation({
    mutationFn: (isOpen: boolean) => businessesApi.update(business!.id, { isOpen }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business-mine'] }),
  });

  const newOrders = orders.filter((o: any) => o.status === 'PENDING');
  const activeOrders = orders.filter((o: any) =>
    ['CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP'].includes(o.status),
  );
  const doneOrders = orders.filter((o: any) =>
    ['DELIVERED', 'CANCELLED'].includes(o.status),
  );

  const readyOrders = activeOrders.filter((o: any) => o.status === 'READY');

  const list = tab === 'new' ? newOrders : tab === 'active' ? activeOrders : doneOrders;

  const todayOrders = orders.filter((o: any) => {
    try {
      const d = new Date(o.createdAt);
      const today = new Date();
      return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    } catch { return false; }
  });

  const revenue = todayOrders.filter((o: any) => o.status === 'DELIVERED').reduce((acc: number, o: any) => acc + Number(o.total || 0), 0);
  const preparingCount = activeOrders.length;
  const completedCount = orders.filter((o: any) => o.status === 'DELIVERED').length;

  const formatDate = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['business-mine'] }),
      queryClient.invalidateQueries({ queryKey: ['business-orders'] }),
    ]);
    setRefreshing(false);
  };

  const toggleSelect = (orderId: string) => {
    setSelectedIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId],
    );
  };

  const handleBatchAssign = () => {
    if (selectedIds.length === 0) return;
    router.push({ pathname: '/driver-selection', params: { orderIds: selectedIds.join(',') } });
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
          <NotificationBell size={24} />
          <Switch
            value={isOpen}
            onValueChange={(val) => business && toggleOpen.mutate(val)}
            trackColor={{ true: colors.primary }}
            disabled={toggleOpen.isPending}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing[4], paddingBottom: insets.bottom + spacing[4] }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
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

        {/* Batch assign toolbar — only on active tab when READY orders exist */}
        {tab === 'active' && readyOrders.length > 0 && (
          <View style={styles.batchToolbar}>
            {!selectMode ? (
              <Pressable style={styles.batchBtn} onPress={() => setSelectMode(true)}>
                <Text style={styles.batchBtnText}>📦 تجميع طلبات جاهزة لسائق واحد</Text>
              </Pressable>
            ) : (
              <View style={{ gap: spacing[2] }}>
                <Text style={styles.batchHint}>
                  {selectedIds.length === 0
                    ? 'اختر الطلبات الجاهزة التي تريد إرسالها معاً'
                    : `تم اختيار ${selectedIds.length} طلب — يجب أن تكون في نفس المدينة`}
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                  <Pressable
                    style={[styles.batchBtn, { flex: 1, backgroundColor: colors.border }]}
                    onPress={() => { setSelectMode(false); setSelectedIds([]); }}
                  >
                    <Text style={[styles.batchBtnText, { color: colors.textPrimary }]}>إلغاء</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.batchBtn, { flex: 2, opacity: selectedIds.length === 0 ? 0.4 : 1 }]}
                    onPress={handleBatchAssign}
                    disabled={selectedIds.length === 0}
                  >
                    <Text style={styles.batchBtnText}>🚗 اختر سائقاً ({selectedIds.length})</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Orders */}
        <View style={{ gap: spacing[3] }}>
          {list.map((o: any) => {
            const itemsCount = o.items?.reduce((acc: number, it: any) => acc + Number(it.quantity || 0), 0) ?? 0;
            const isReady = o.status === 'READY';
            const isSelected = selectedIds.includes(o.id);
            const isSelectable = selectMode && isReady;

            return (
              <Pressable
                key={o.id}
                style={[
                  styles.orderCard,
                  isSelected && styles.orderCardSelected,
                ]}
                onPress={() => {
                  if (isSelectable) {
                    toggleSelect(o.id);
                  } else {
                    router.push(`/order/${o.id}`);
                  }
                }}
                onLongPress={() => {
                  if (tab === 'active' && isReady && !selectMode) {
                    setSelectMode(true);
                    setSelectedIds([o.id]);
                  }
                }}
              >
                {/* Selection checkbox for READY orders in select mode */}
                {isSelectable && (
                  <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                    {isSelected && <Text style={{ color: '#fff', fontSize: 12, fontFamily: fontFamily.bold }}>✓</Text>}
                  </View>
                )}
                <View style={styles.orderRow}>
                  <Text style={styles.orderId}>طلب #{o.id.slice(-6).toUpperCase()}</Text>
                  <Text style={styles.muted}>{formatDate(o.createdAt)}</Text>
                </View>
                <Text style={styles.customer}>{o.customer?.name || 'زبون منصة شو عبالك'}</Text>
                <View style={styles.orderRow}>
                  <Text style={styles.muted}>{itemsCount} عناصر · {o.paymentMethod === 'CASH' ? 'نقدي' : 'إلكتروني'}</Text>
                  <Text style={styles.total}>{o.total} ₪</Text>
                </View>
                {isReady && (
                  <View style={styles.readyBadge}>
                    <Text style={styles.readyBadgeText}>جاهز للتوصيل ✅</Text>
                  </View>
                )}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing[4], backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  storeName: { fontSize: fontSizes.lg, fontFamily: fontFamily.bold, color: colors.textPrimary, textAlign: 'right' },
  status: { fontSize: fontSizes.sm, marginTop: 2, fontFamily: fontFamily.semibold, textAlign: 'right' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], marginBottom: spacing[5] },
  stat: { width: '47%', borderRadius: radius.lg, padding: spacing[4], flexGrow: 1, alignItems: 'flex-end' },
  statValue: { color: '#fff', fontSize: 24, fontFamily: fontFamily.extrabold },
  statLabel: { color: '#fff', fontSize: fontSizes.sm, opacity: 0.9, marginTop: 2 },
  tabs: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[4] },
  tab: { flex: 1, paddingVertical: spacing[3], borderRadius: radius.md, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textMuted, fontFamily: fontFamily.semibold },
  tabTextActive: { color: '#fff' },
  redDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  batchToolbar: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[3], marginBottom: spacing[3], borderWidth: 1, borderColor: colors.primary + '40' },
  batchBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing[3], alignItems: 'center' },
  batchBtnText: { color: '#fff', fontFamily: fontFamily.bold, fontSize: fontSizes.sm },
  batchHint: { color: colors.textMuted, fontSize: fontSizes.sm, textAlign: 'center', marginBottom: spacing[1] },
  orderCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, gap: 4 },
  orderCardSelected: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primary + '08' },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontFamily: fontFamily.bold, color: colors.textPrimary, fontSize: fontSizes.base },
  customer: { color: colors.textPrimary, fontSize: fontSizes.base, textAlign: 'right' },
  muted: { color: colors.textMuted, fontSize: fontSizes.sm },
  total: { color: colors.primary, fontFamily: fontFamily.bold, fontSize: fontSizes.base },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing[10] },
  readyBadge: { alignSelf: 'flex-end', backgroundColor: '#DCFCE7', borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: 2, marginTop: 4 },
  readyBadgeText: { color: '#166534', fontFamily: fontFamily.bold, fontSize: fontSizes.xs },
  checkbox: { position: 'absolute', top: spacing[3], left: spacing[3], width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', zIndex: 1 },
  checkboxChecked: { backgroundColor: colors.primary },
});
