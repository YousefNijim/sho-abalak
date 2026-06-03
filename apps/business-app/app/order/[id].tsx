import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@shu/ui-components/native';
import { Star } from 'lucide-react-native';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';
import { ordersApi, reviewsApi } from '@shu/api-client';
import { useSocket } from '../../src/hooks/useSocket';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'بانتظار التأكيد',
  CONFIRMED: 'تم القبول',
  PREPARING: 'جاري التحضير',
  READY: 'جاهز للاستلام',
  PICKED_UP: 'مع السائق (في الطريق)',
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

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(id!),
    enabled: !!id,
  });

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
  }, [order?.status, order?.driverId, (order as any)?.driverReview]);

  const submitDriverReview = useMutation({
    mutationFn: () => reviewsApi.createDriverReview({ orderId: order!.id, rating: driverRating }),
    onSuccess: () => {
      setDriverRatingVisible(false);
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      Alert.alert('شكراً! 🌟', 'تم إرسال تقييم السائق بنجاح');
    },
    onError: () => {
      Alert.alert('خطأ', 'فشل إرسال التقييم');
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
      <Modal visible={updateStatus.isPending} transparent animationType="fade">
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

      <ScrollView contentContainerStyle={{ padding: spacing[4], paddingBottom: 100, gap: spacing[4] }}>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.title}>طلب #{order.id.slice(-6).toUpperCase()}</Text>
          <Text style={styles.muted}>{order.customer?.name || 'زبون شو عبالك'}</Text>
          <Text style={styles.muted}>{order.customer?.phone || ''}</Text>
        </View>

        {/* Status indicator */}
        <View style={styles.statusBanner}>
          <Text style={styles.statusLabel}>الحالة الحالية: {STATUS_LABELS[status] || status}</Text>
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
          <Button
            title="اختيار سائق 🚗"
            onPress={() =>
              router.push({
                pathname: '/driver-selection',
                params: { orderId: order.id },
              })
            }
          />
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
  statusLabel: { color: colors.primary, fontFamily: fontFamily.bold, fontSize: fontSizes.sm, textAlign: 'right' },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing[6], gap: spacing[4] },
  modalTitle: { fontFamily: fontFamily.extrabold, fontSize: fontSizes.xl, color: colors.textPrimary, textAlign: 'center' },
  modalSubtitle: { fontFamily: fontFamily.medium, fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'center' },
  modalBtns: { flexDirection: 'row', gap: spacing[3] },
  skipBtn: { flex: 1, paddingVertical: spacing[3], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  skipText: { fontFamily: fontFamily.semibold, color: colors.textMuted },
  submitBtn: { flex: 2, paddingVertical: spacing[3], borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center' },
  submitText: { fontFamily: fontFamily.bold, color: '#fff' },
});
