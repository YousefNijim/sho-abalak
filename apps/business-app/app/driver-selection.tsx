import { useState, useEffect, useRef, useMemo } from 'react';
import { ActivityIndicator, Alert, AppState, AppStateStatus, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@shu/ui-components/native';
import { colors, fontSizes, fontFamily, radius, spacing } from '../src/theme';
import { businessesApi, driversApi, ordersApi } from '@shu/api-client';
import { useSocket } from '../src/hooks/useSocket';
import { Store, Car, Truck, Bike, Info, ArrowRight } from 'lucide-react-native';

type WizardStep = 'MODE' | 'VEHICLE' | 'DRIVERS';
type VehicleType = 'MOTORCYCLE' | 'CAR' | 'VAN';

export default function DriverSelection() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ orderId?: string; orderIds?: string }>();

  const orderIds: string[] = params.orderIds
    ? params.orderIds.split(',').filter(Boolean)
    : params.orderId
    ? [params.orderId]
    : [];

  const isBatch = orderIds.length > 1;

  const [step, setStep] = useState<WizardStep>('MODE');
  const [vehicleType, setVehicleType] = useState<VehicleType>('MOTORCYCLE');
  const [filter, setFilter] = useState<'mine' | 'all'>('mine');
  const [pendingDriverId, setPendingDriverId] = useState<string | null>(null);

  const { data: business, isLoading: loadingBusiness } = useQuery({
    queryKey: ['business-mine'],
    queryFn: () => businessesApi.mine(),
  });

  const areaId = business?.areaId;

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['orders-batch', orderIds.join(',')],
    queryFn: () => Promise.all(orderIds.map(id => ordersApi.getById(id))),
    enabled: orderIds.length > 0,
  });

  // Calculate total quantity to suggest vehicle
  const totalQty = useMemo(() => {
    return orders.reduce((sum, order) => {
      return sum + (order.items?.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0) || 0);
    }, 0);
  }, [orders]);

  // Auto-suggest CAR if > 20 items
  useEffect(() => {
    if (totalQty > 20) {
      setVehicleType('CAR');
    }
  }, [totalQty]);

  // Skip MODE step if business is PLATFORM only
  useEffect(() => {
    if (business && business.deliveryType === 'PLATFORM' && step === 'MODE') {
      setStep('VEHICLE');
    }
  }, [business, step]);

  const { data: drivers = [], isLoading: loadingDrivers } = useQuery({
    queryKey: ['available-drivers', filter, areaId, vehicleType],
    queryFn: () => driversApi.available(filter === 'mine' ? areaId : undefined, vehicleType),
    enabled: !!business && step === 'DRIVERS',
  });

  // Self delivery mutation
  const setSelfDelivery = useMutation({
    mutationFn: async () => {
      // For batch, we update all to PICKED_UP and set deliveryMode = 'SELF'
      // Wait, currently we don't have a batch update status. We update one by one.
      await Promise.all(
        orderIds.map((id) =>
          ordersApi.updateStatus(id, { status: 'PICKED_UP' }) // We will add deliveryMode to API later
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-orders'] });
      router.replace(isBatch ? '/(tabs)/orders' : `/order/${orderIds[0]}`);
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err.response?.data?.message || 'حدث خطأ.');
    },
  });

  // Request driver mutation
  const sendRequest = useMutation({
    mutationFn: (driverId: string) => ordersApi.sendDriverRequest(orderIds, driverId, vehicleType),
    onSuccess: (_, driverId) => {
      setPendingDriverId(driverId);
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err.response?.data?.message || 'فشل إرسال الطلب للسائق.');
    },
  });

  // Customer contact mutation
  const requestCustomerContact = useMutation({
    mutationFn: async () => {
      await ordersApi.requestCustomerContact(orderIds, vehicleType);
      Alert.alert('نجاح', 'تم إرسال طلب تواصل للمنصة. سيتم التواصل مع الزبون وإبلاغك بالنتيجة.');
      router.back();
    },
  });

  const socket = useSocket();
  const appStateRef = useRef(AppState.currentState);

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
        queryClient.invalidateQueries({ queryKey: ['available-drivers'] });
        Alert.alert('تم رفض الطلب', `اعتذر السائق ${payload.driverName} عن التوصيل. الرجاء اختيار سائق آخر.`);
      }
    };
    socket.on('order:status_update', handleStatusUpdate);
    socket.on('order:driver_rejected', handleDriverRejected);
    return () => {
      socket.off('order:status_update', handleStatusUpdate);
      socket.off('order:driver_rejected', handleDriverRejected);
    };
  }, [socket, orderIds.join(','), queryClient, router]);

  if (loadingBusiness || loadingOrders) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (pendingDriverId) {
    const pendingDriver = drivers.find((d: any) => d.id === pendingDriverId);
    return (
      <View style={[styles.center, { padding: spacing[5] }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.pendingTitle}>تم إرسال {isBatch ? \`\${orderIds.length} طلبات\` : 'الطلب'} للسائق</Text>
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

  const renderModeStep = () => (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.stepTitle}>كيف تريد توصيل الطلب؟</Text>
      
      <Pressable style={styles.modeCard} onPress={() => setStep('VEHICLE')}>
        <View style={styles.modeIcon}><Car size={28} color={colors.primary} /></View>
        <View style={styles.modeText}>
          <Text style={styles.modeTitle}>سائق المنصة 🚗</Text>
          <Text style={styles.modeDesc}>إرسال الطلب لأحد سائقي منصة شو عبالك</Text>
        </View>
        <ArrowRight size={20} color={colors.textMuted} />
      </Pressable>

      {business?.deliveryType === 'SELF' && (
        <Pressable style={styles.modeCard} onPress={() => {
          Alert.alert(
            'تأكيد',
            'هل أنت متأكد من توصيل الطلب بنفسك؟ سيتم تحويل حالة الطلب إلى (في الطريق).',
            [
              { text: 'إلغاء', style: 'cancel' },
              { text: 'تأكيد', onPress: () => setSelfDelivery.mutate() }
            ]
          );
        }}>
          <View style={[styles.modeIcon, { backgroundColor: '#DCFCE7' }]}><Store size={28} color="#166534" /></View>
          <View style={styles.modeText}>
            <Text style={styles.modeTitle}>توصيل من المتجر 🏪</Text>
            <Text style={styles.modeDesc}>ستقوم أنت أو أحد موظفيك بتوصيل هذا الطلب</Text>
          </View>
          <ArrowRight size={20} color={colors.textMuted} />
        </Pressable>
      )}
    </ScrollView>
  );

  const renderVehicleStep = () => (
    <ScrollView contentContainerStyle={styles.scroll}>
      {business?.deliveryType === 'SELF' && (
        <Pressable onPress={() => setStep('MODE')} style={styles.backBtn}>
          <ArrowRight size={20} color={colors.primary} />
          <Text style={styles.backText}>رجوع</Text>
        </Pressable>
      )}
      
      <Text style={styles.stepTitle}>ما نوع المركبة المطلوبة؟</Text>
      <Text style={styles.stepSubtitle}>يحتوي الطلب على {totalQty} منتجات</Text>
      
      {totalQty > 20 && (
        <View style={styles.hintBox}>
          <Info size={16} color="#92400E" />
          <Text style={styles.hintText}>ننصح باختيار سيارة أو فان لأن حجم الطلب كبير.</Text>
        </View>
      )}

      {[
        { type: 'MOTORCYCLE', label: 'دراجة نارية 🏍️', desc: 'للطلبات الصغيرة والمتوسطة', icon: <Bike size={24} color={vehicleType === 'MOTORCYCLE' ? '#fff' : colors.textMuted} /> },
        { type: 'CAR', label: 'سيارة 🚗', desc: 'للطلبات الكبيرة', icon: <Car size={24} color={vehicleType === 'CAR' ? '#fff' : colors.textMuted} /> },
        { type: 'VAN', label: 'فان 🚐', desc: 'للطلبات الكبيرة جداً أو البضائع', icon: <Truck size={24} color={vehicleType === 'VAN' ? '#fff' : colors.textMuted} /> },
      ].map(v => (
        <Pressable
          key={v.type}
          style={[styles.vehicleCard, vehicleType === v.type && styles.vehicleCardActive]}
          onPress={() => setVehicleType(v.type as VehicleType)}
        >
          <View style={[styles.vehicleIcon, vehicleType === v.type && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            {v.icon}
          </View>
          <View style={styles.modeText}>
            <Text style={[styles.vehicleTitle, vehicleType === v.type && { color: '#fff' }]}>{v.label}</Text>
            <Text style={[styles.vehicleDesc, vehicleType === v.type && { color: 'rgba(255,255,255,0.8)' }]}>{v.desc}</Text>
          </View>
          {vehicleType === v.type && <View style={styles.checkCircle}><View style={styles.checkDot} /></View>}
        </Pressable>
      ))}

      <Button
        title="متابعة"
        style={{ marginTop: spacing[4] }}
        onPress={() => setStep('DRIVERS')}
      />
    </ScrollView>
  );

  const renderDriversStep = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => setStep('VEHICLE')} style={styles.backBtn}>
          <ArrowRight size={20} color={colors.primary} />
          <Text style={styles.backText}>تغيير المركبة ({
            vehicleType === 'CAR' ? 'سيارة' : vehicleType === 'VAN' ? 'فان' : 'دراجة'
          })</Text>
        </Pressable>
      </View>

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
        {loadingDrivers ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing[8] }} />
        ) : drivers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.empty}>لا يوجد سائقون بـ ({vehicleType === 'CAR' ? 'سيارة' : vehicleType === 'VAN' ? 'فان' : 'دراجة نارية'}) متاحون حالياً</Text>
            {vehicleType !== 'MOTORCYCLE' && (
              <View style={styles.emptyActions}>
                <Button
                  title="طلب تواصل المنصة مع الزبون"
                  onPress={() => requestCustomerContact.mutate()}
                  style={{ width: '100%', marginBottom: spacing[3] }}
                />
                <Button
                  title="إلغاء الطلب"
                  variant="secondary"
                  onPress={() => {
                    Alert.alert('إلغاء', 'هل أنت متأكد من إلغاء الطلب لعدم توفر مركبة؟', [
                      { text: 'تراجع', style: 'cancel' },
                      { text: 'إلغاء الطلب', style: 'destructive', onPress: () => {
                        // cancellation logic
                      }}
                    ]);
                  }}
                  style={{ width: '100%' }}
                />
              </View>
            )}
          </View>
        ) : (
          drivers.map((d: any) => (
            <View key={d.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={{ fontSize: 24 }}>{d.vehicleType === 'CAR' ? '🚗' : d.vehicleType === 'VAN' ? '🚐' : '🛵'}</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={styles.name}>{d.user?.name || 'سائق منصة'}</Text>
                  <Text style={styles.muted}>{d.area?.city} - {d.area?.name}</Text>
                  <Text style={styles.muted}>⭐ {d.rating ? d.rating.toFixed(1) : '5.0'}</Text>
                </View>
                <View style={styles.availTag}><Text style={styles.availText}>نشط</Text></View>
              </View>
              
              {(vehicleType === 'CAR' || vehicleType === 'VAN') && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>سيتم إبلاغ الزبون بتغيير الأجرة بسبب حجم الطلب المرتفع.</Text>
                </View>
              )}

              <Button
                title={sendRequest.isPending && sendRequest.variables === d.id ? 'جاري الإرسال...' : `إرسال ${isBatch ? \`\${orderIds.length} طلبات\` : 'الطلب'} للسائق`}
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {step === 'MODE' && renderModeStep()}
      {step === 'VEHICLE' && renderVehicleStep()}
      {step === 'DRIVERS' && renderDriversStep()}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing[5], gap: spacing[4] },
  stepTitle: { fontSize: fontSizes['2xl'], fontFamily: fontFamily.bold, color: colors.textPrimary, textAlign: 'right', marginBottom: spacing[2] },
  stepSubtitle: { fontSize: fontSizes.base, color: colors.textMuted, textAlign: 'right', marginBottom: spacing[2] },
  modeCard: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: colors.surface, padding: spacing[4], borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, gap: spacing[4] },
  modeIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  modeText: { flex: 1, alignItems: 'flex-end' },
  modeTitle: { fontSize: fontSizes.lg, fontFamily: fontFamily.bold, color: colors.textPrimary, marginBottom: 4 },
  modeDesc: { fontSize: fontSizes.sm, fontFamily: fontFamily.regular, color: colors.textMuted, textAlign: 'right' },
  vehicleCard: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: colors.surface, padding: spacing[4], borderRadius: radius.xl, borderWidth: 2, borderColor: colors.border, gap: spacing[4] },
  vehicleCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  vehicleIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  vehicleTitle: { fontSize: fontSizes.lg, fontFamily: fontFamily.bold, color: colors.textPrimary, marginBottom: 4 },
  vehicleDesc: { fontSize: fontSizes.sm, fontFamily: fontFamily.regular, color: colors.textMuted, textAlign: 'right' },
  checkCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  checkDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff' },
  hintBox: { flexDirection: 'row-reverse', backgroundColor: '#FEF3C7', padding: spacing[3], borderRadius: radius.md, alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] },
  hintText: { flex: 1, fontSize: fontSizes.sm, color: '#92400E', fontFamily: fontFamily.medium, textAlign: 'right' },
  headerBar: { flexDirection: 'row-reverse', padding: spacing[4], backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing[1] },
  backText: { color: colors.primary, fontFamily: fontFamily.medium },
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
  emptyContainer: { alignItems: 'center', marginTop: spacing[12] },
  empty: { textAlign: 'center', color: colors.textMuted, marginBottom: spacing[6], fontFamily: fontFamily.medium, fontSize: fontSizes.base },
  emptyActions: { width: '100%', paddingHorizontal: spacing[4] },
  pendingTitle: { fontSize: fontSizes.xl, fontFamily: fontFamily.bold, color: colors.textPrimary, marginTop: spacing[5], textAlign: 'center' },
  pendingName: { fontSize: fontSizes.lg, fontFamily: fontFamily.extrabold, color: colors.primary, marginTop: spacing[2], textAlign: 'center' },
  pendingSubtitle: { fontSize: fontSizes.base, color: colors.textMuted, marginTop: spacing[2], textAlign: 'center' },
  warningBox: { backgroundColor: '#FFF7ED', padding: spacing[3], borderRadius: radius.md, marginTop: spacing[3], borderWidth: 1, borderColor: '#FED7AA' },
  warningText: { color: '#C2410C', fontSize: fontSizes.xs, fontFamily: fontFamily.medium, textAlign: 'right' },
});
