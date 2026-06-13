import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@shu/ui-components/native';
import { Star } from 'lucide-react-native';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';
import { ordersApi, reviewsApi } from '@shu/api-client';
import { useSocket } from '../../src/hooks/useSocket';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'بانتظار التأكيد',
  ESCALATED: 'مصعّد للإدارة ⏳',
  CONFIRMED: 'تم القبول',
  PREPARING: 'جاري التحضير',
  READY: 'جاهز للاستلام',
  PICKED_UP: 'في الطريق للزبون',
  DELIVERED: 'تم التسليم بنجاح',
  CANCELLED: 'تم إلغاء الطلب',
};

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const submitting = useRef(false);

  // Driver rating modal
  const [driverRatingVisible, setDriverRatingVisible] = useState(false);
  const [driverRating, setDriverRating] = useState(0);
  const driverRatingShownRef = useRef(false);

  // Escalation modal state
  const [escalationModalVisible, setEscalationModalVisible] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');

  // Delivery selection modal (at READY — store orders only)
  const [deliveryChoiceVisible, setDeliveryChoiceVisible] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(id!),
    enabled: !!id,
  });

  const isStoreOrder = (order?.business as any)?.type === 'STORE';

  const updateStatus = useMutation({
    mutationFn: (status: string) => ordersApi.updateStatus(id!, { status }),
    onSuccess: () => {
      submitting.current = false;
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['business-orders'] });
    },
    onError: (err: any) => {
      submitting.current = false;
      const msg = err.response?.data?.message || 'فشل تحديث حالة الطلب.';
      Alert.alert('خطأ', msg);
    },
  });

  const escalateMutation = useMutation({
    mutationFn: (reason: string) => ordersApi.escalateOrder(id!, { reason: reason || undefined }),
    onSuccess: () => {
      setEscalationModalVisible(false);
      setEscalationReason('');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['business-orders'] });
      Alert.alert('تم التصعيد ✅', 'تم إرسال الطلب للإدارة لتعديل رسوم التوصيل');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'فشل تصعيد الطلب.';
      Alert.alert('خطأ', msg);
    },
  });

  const selfDeliverMutation = useMutation({
    mutationFn: () => ordersApi.selfDeliver(id!),
    onSuccess: () => {
      setDeliveryChoiceVisible(false);
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['business-orders'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'فشل تغيير طريقة التوصيل.';
      Alert.alert('خطأ', msg);
    },
  });

  const handleStatusChange = (status: string) => {
    if (submitting.current || updateStatus.isPending) return;
    submitting.current = true;
    updateStatus.mutate(status);
  };

  // Show driver rating modal once when order becomes DELIVERED and has a driver
  useEffect(() => {
    if (
      order?.status === 'DELIVERED' &&
      order?.driverId &&
      !order?.driverReview &&
      !driverRatingShownRef.current
    ) {
      driverRatingShownRef.current = true;
      setTimeout(() => setDriverRatingVisible(true), 600);
    }
  }, [order?.status, order?.driverId, order?.driverReview]);

  const submitDriverReview = useMutation({
    mutationFn: () => reviewsApi.createDriverReview({ orderId: order!.id, rating: driverRating }),
    onSuccess: () => {
      setDriverRatingVisible(false);
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      Alert.alert('شكراً! 🌟', 'تم إرسال تقييم السائق بنجاح');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'فشل إرسال التقييم';
      Alert.alert('خطأ', msg);
    },
  });

  const handleReject = () => {
    if (submitting.current || updateStatus.isPending) return;
    Alert.alert('رفض الطلب', 'هل أنت متأكد من رفض الطلب؟', [
      { text: 'تراجع', style: 'cancel' },
      {
        text: 'رفض',
        style: 'destructive',
        onPress: () => handleStatusChange('CANCELLED'),
      },
    ]);
  };

  const socket = useSocket();

  useEffect(() => {
    if (!socket || !id) return;

    const handleStatusUpdate = (payload: { orderId: string; status: string }) => {
      if (payload.orderId === id) {
        queryClient.invalidateQueries({ queryKey: ['order', id] });
        queryClient.invalidateQueries({ queryKey: ['business-orders'] });
      }
    };

    const handleDriverRejected = (payload: { orderId: string; driverName: string }) => {
      if (payload.orderId === id) {
        if (Platform.OS === 'web') {
          window.alert(`اعتذر السائق ${payload.driverName} عن توصيل الطلب. يرجى تعيين سائق آخر للطلب.`);
        } else {
          Alert.alert('سائق غير متاح', `اعتذر السائق ${payload.driverName} عن توصيل الطلب. يرجى تعيين سائق آخر للطلب.`);
        }
        queryClient.invalidateQueries({ queryKey: ['order', id] });
        queryClient.invalidateQueries({ queryKey: ['business-orders'] });
      }
    };

    socket.on('order:status_update', handleStatusUpdate);
    socket.on('order:driver_rejected', handleDriverRejected);

    return () => {
      socket.off('order:status_update', handleStatusUpdate);
      socket.off('order:driver_rejected', handleDriverRejected);
    };
  }, [socket, id, queryClient]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textMuted }}>الطلب غير موجود</Text>
      </View>
    );
  }

  const items = order.items || [];
  const status = order.status;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Loading overlay while status update is in flight */}
      <Modal visible={updateStatus.isPending || escalateMutation.isPending || selfDeliverMutation.isPending} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.overlayText}>جاري التحديث...</Text>
          </View>
        </View>
      </Modal>

      {/* Driver rating modal */}
      <Modal visible={driverRatingVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>قيّم السائق 🛵</Text>
            <Text style={styles.modalSubtitle}>
              {order?.driver?.user?.name || 'السائق'} — كيف كانت سرعة الاستجابة والتوصيل؟
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing[3], marginVertical: spacing[2] }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setDriverRating(n)}>
                  <Star size={40} color="#F59E0B" fill={n <= driverRating ? '#F59E0B' : 'transparent'} />
                </Pressable>
              ))}
            </View>
            <View style={styles.modalBtns}>
              <Pressable style={styles.skipBtn} onPress={() => setDriverRatingVisible(false)}>
                <Text style={styles.skipText}>تخطي</Text>
              </Pressable>
              <Pressable
                style={[styles.submitBtn, driverRating === 0 && { opacity: 0.4 }]}
                disabled={driverRating === 0 || submitDriverReview.isPending}
                onPress={() => submitDriverReview.mutate()}
              >
                {submitDriverReview.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitText}>إرسال التقييم</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Escalation reason modal */}
      <Modal visible={escalationModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🚗 تصعيد الطلب للإدارة</Text>
            <Text style={styles.modalSubtitle}>
              سيتم إبلاغ الإدارة لتحديد رسوم التوصيل المناسبة لمركبة أكبر.
            </Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="سبب التصعيد (اختياري)"
              placeholderTextColor={colors.textMuted}
              value={escalationReason}
              onChangeText={setEscalationReason}
              multiline
              textAlign="right"
            />
            <View style={styles.modalBtns}>
              <Pressable style={styles.skipBtn} onPress={() => { setEscalationModalVisible(false); setEscalationReason(''); }}>
                <Text style={styles.skipText}>إلغاء</Text>
              </Pressable>
              <Pressable
                style={styles.submitBtn}
                disabled={escalateMutation.isPending}
                onPress={() => escalateMutation.mutate(escalationReason)}
              >
                <Text style={styles.submitText}>تصعيد للإدارة</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delivery choice modal (READY + store order) */}
      <Modal visible={deliveryChoiceVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>كيف تريد توصيل الطلب؟</Text>
            <Text style={styles.modalSubtitle}>اختر طريقة التوصيل للمتابعة</Text>
            <View style={{ gap: spacing[3], marginTop: spacing[4] }}>
              <Pressable
                style={[styles.deliveryOptionBtn, { backgroundColor: colors.primary }]}
                disabled={selfDeliverMutation.isPending}
                onPress={() => selfDeliverMutation.mutate()}
              >
                <Text style={styles.deliveryOptionText}>🏪 توصيل من المتجر</Text>
                <Text style={[styles.deliveryOptionSub, { color: 'rgba(255,255,255,0.8)' }]}>ستوصّل الطلب بنفسك</Text>
              </Pressable>
              <Pressable
                style={[styles.deliveryOptionBtn, { backgroundColor: colors.secondary }]}
                onPress={() => {
                  setDeliveryChoiceVisible(false);
                  router.push({ pathname: '/driver-selection', params: { orderId: order.id } });
                }}
              >
                <Text style={styles.deliveryOptionText}>🚗 توصيل من المنصة</Text>
                <Text style={[styles.deliveryOptionSub, { color: 'rgba(255,255,255,0.8)' }]}>اختيار سائق من المنصة</Text>
              </Pressable>
            </View>
            <Pressable style={[styles.skipBtn, { marginTop: spacing[3], alignSelf: 'center' }]} onPress={() => setDeliveryChoiceVisible(false)}>
              <Text style={styles.skipText}>تراجع</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{ padding: spacing[4], paddingBottom: 100, gap: spacing[4] }}>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.title}>طلب #{order.id.slice(-6).toUpperCase()}</Text>
          <Text style={styles.muted}>{order.customer?.name || 'زبون شو عبالك'}</Text>
          <Text style={styles.muted}>{order.customer?.phone || ''}</Text>
        </View>

        {/* Status indicator */}
        <View style={[styles.statusBanner, status === 'ESCALATED' && styles.escalatedBanner]}>
          <Text style={[styles.statusLabel, status === 'ESCALATED' && styles.escalatedLabel]}>
            الحالة الحالية: {STATUS_LABELS[status] || status}
          </Text>
          {status === 'ESCALATED' && (order as any).escalationReason && (
            <Text style={styles.escalationReasonText}>السبب: {(order as any).escalationReason}</Text>
          )}
        </View>

        {/* Items */}
        <View style={styles.card}>
          {items.map((it: any) => (
            <View key={it.id} style={styles.itemRow}>
              <Text style={styles.itemPrice}>{it.unitPrice * it.quantity} ₪</Text>
              <Text style={styles.itemName}>{it.product?.name} (x{it.quantity})</Text>
            </View>
          ))}
        </View>

        {/* Customer Note */}
        {order.note && (
          <View style={styles.note}>
            <Text style={styles.noteText}>📝 ملاحظة الزبون: {order.note}</Text>
          </View>
        )}

        {/* Delivery address */}
        {(order.deliveryAreaName || order.deliveryAddressDetail) && (
          <View style={styles.addressCard}>
            <Text style={styles.addressCardTitle}>عنوان التوصيل</Text>
            {order.deliveryAreaName && (
              <Text style={styles.addressAreaName}>{order.deliveryAreaName}</Text>
            )}
            {order.deliveryAddressDetail && (
              <Text style={styles.addressDetail}>{order.deliveryAddressDetail}</Text>
            )}
          </View>
        )}

        {/* Info */}
        <View style={styles.infoCard}>
          <Info label="طريقة الدفع" value={order.paymentMethod === 'CASH' ? 'نقدي عند الاستلام' : 'دفع إلكتروني'} />
          <Info label="الإجمالي" value={`${order.total} ₪`} bold />
        </View>
      </ScrollView>

      {/* Footer — only ONE actionable transition per status, all guarded */}
      <View style={styles.footer}>
        {status === 'PENDING' ? (
          isStoreOrder ? (
            // Store: 3 buttons — رفض | قبول | تصعيد
            <View style={{ gap: spacing[2] }}>
              <View style={styles.btnRow}>
                <Button
                  title="رفض"
                  variant="danger"
                  style={{ flex: 1 }}
                  disabled={updateStatus.isPending}
                  onPress={handleReject}
                />
                <Button
                  title="قبول الطلب ✅"
                  style={{ flex: 1 }}
                  disabled={updateStatus.isPending}
                  onPress={() => handleStatusChange('CONFIRMED')}
                />
              </View>
              <Button
                title="🚗 تصعيد (يحتاج سيارة)"
                variant="secondary"
                disabled={updateStatus.isPending}
                onPress={() => setEscalationModalVisible(true)}
              />
            </View>
          ) : (
            // Restaurant: original 2 buttons
            <View style={styles.btnRow}>
              <Button
                title="رفض"
                variant="danger"
                style={{ flex: 1 }}
                disabled={updateStatus.isPending}
                onPress={handleReject}
              />
              <Button
                title="قبول الطلب"
                style={{ flex: 1 }}
                disabled={updateStatus.isPending}
                onPress={() => handleStatusChange('CONFIRMED')}
              />
            </View>
          )
        ) : status === 'ESCALATED' ? (
          <View style={styles.escalatedState}>
            <Text style={styles.escalatedStateText}>⏳ بانتظار تدخّل الإدارة لتحديد رسوم التوصيل</Text>
          </View>
        ) : status === 'CONFIRMED' ? (
          <Button
            title="بدء التحضير"
            disabled={updateStatus.isPending}
            onPress={() => handleStatusChange('PREPARING')}
          />
        ) : status === 'PREPARING' ? (
          <Button
            title="الطلب جاهز ✅"
            disabled={updateStatus.isPending}
            onPress={() => handleStatusChange('READY')}
          />
        ) : status === 'READY' ? (
          isStoreOrder ? (
            // Store: delivery choice modal
            <Button
              title="اختيار طريقة التوصيل 🚗"
              onPress={() => setDeliveryChoiceVisible(true)}
            />
          ) : (
            // Restaurant: go directly to driver selection
            <Button
              title="اختيار سائق 🚗"
              onPress={() =>
                router.push({
                  pathname: '/driver-selection',
                  params: { orderId: order.id },
                })
              }
            />
          )
        ) : status === 'PICKED_UP' ? (
          (order as any).deliveryMode === 'SELF' ? (
            // Self-delivery: store marks delivered
            <Button
              title="✅ تم تسليم الطلب للزبون"
              disabled={updateStatus.isPending}
              onPress={() =>
                Alert.alert('تأكيد التسليم', 'هل سلّمت الطلب للزبون؟', [
                  { text: 'لا', style: 'cancel' },
                  { text: 'نعم، تم التسليم', onPress: () => handleStatusChange('DELIVERED') },
                ])
              }
            />
          ) : (
            // Platform delivery: driver marks delivered
            <View style={styles.escalatedState}>
              <Text style={styles.escalatedStateText}>🚗 الطلب مع السائق — سيؤكد السائق التسليم</Text>
            </View>
          )
        ) : (
          <View style={styles.completedState}>
            <Text style={styles.completedText}>🏁 {STATUS_LABELS[status]}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function Info({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoValue, bold && { fontFamily: fontFamily.extrabold, color: colors.primary, fontSize: fontSizes.lg }]}>{value}</Text>
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  overlayCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[6], alignItems: 'center', gap: spacing[3], minWidth: 200 },
  overlayText: { fontFamily: fontFamily.bold, fontSize: fontSizes.base, color: colors.textPrimary, textAlign: 'center' },
  title: { fontSize: fontSizes.xl, fontFamily: fontFamily.bold, color: colors.textPrimary },
  muted: { color: colors.textMuted, fontSize: fontSizes.sm, textAlign: 'right' },
  statusBanner: { backgroundColor: colors.primary + '10', borderLeftWidth: 4, borderLeftColor: colors.primary, padding: spacing[3], borderRadius: radius.sm },
  escalatedBanner: { backgroundColor: '#FFF3CD', borderLeftColor: '#F59E0B' },
  statusLabel: { color: colors.primary, fontFamily: fontFamily.bold, fontSize: fontSizes.sm, textAlign: 'right' },
  escalatedLabel: { color: '#92400E' },
  escalationReasonText: { color: '#92400E', fontSize: fontSizes.xs, textAlign: 'right', marginTop: 4 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, gap: spacing[2] },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  itemName: { color: colors.textPrimary, fontSize: fontSizes.base },
  itemPrice: { color: colors.textPrimary, fontFamily: fontFamily.semibold },
  note: { backgroundColor: '#FEF9C3', borderRadius: radius.md, padding: spacing[3] },
  noteText: { color: '#854D0E', fontSize: fontSizes.sm, textAlign: 'right' },
  infoCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, gap: spacing[2] },
  addressCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, gap: spacing[1] },
  addressCardTitle: { fontFamily: fontFamily.semibold, fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'right', marginBottom: spacing[1] },
  addressAreaName: { fontFamily: fontFamily.bold, fontSize: fontSizes.base, color: colors.textPrimary, textAlign: 'right' },
  addressDetail: { fontFamily: fontFamily.regular, fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'right', lineHeight: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  infoValue: { color: colors.textPrimary, fontSize: fontSizes.base },
  footer: { padding: spacing[4], backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
  btnRow: { flexDirection: 'row', gap: spacing[3] },
  completedState: { alignItems: 'center', paddingVertical: 12 },
  completedText: { fontSize: fontSizes.base, fontFamily: fontFamily.bold, color: colors.textMuted },
  escalatedState: { alignItems: 'center', paddingVertical: spacing[4], backgroundColor: '#FFF3CD', borderRadius: radius.md, padding: spacing[3] },
  escalatedStateText: { fontFamily: fontFamily.bold, fontSize: fontSizes.sm, color: '#92400E', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing[6], gap: spacing[4] },
  modalTitle: { fontFamily: fontFamily.extrabold, fontSize: fontSizes.xl, color: colors.textPrimary, textAlign: 'center' },
  modalSubtitle: { fontFamily: fontFamily.medium, fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'center' },
  modalBtns: { flexDirection: 'row', gap: spacing[3] },
  skipBtn: { flex: 1, paddingVertical: spacing[3], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  skipText: { fontFamily: fontFamily.semibold, color: colors.textMuted },
  submitBtn: { flex: 2, paddingVertical: spacing[3], borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center' },
  submitText: { fontFamily: fontFamily.bold, color: '#fff' },
  reasonInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing[3], fontFamily: fontFamily.regular, fontSize: fontSizes.base, color: colors.textPrimary, minHeight: 80, textAlignVertical: 'top' },
  deliveryOptionBtn: { borderRadius: radius.lg, padding: spacing[4], alignItems: 'center', gap: spacing[1] },
  deliveryOptionText: { fontFamily: fontFamily.bold, fontSize: fontSizes.base, color: '#fff' },
  deliveryOptionSub: { fontFamily: fontFamily.regular, fontSize: fontSizes.xs },
});
