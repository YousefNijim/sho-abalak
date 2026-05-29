import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@shu/ui-components/native';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';
import { ordersApi } from '@shu/api-client';

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

  // Fetch live order details
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(id!),
    enabled: !!id,
  });

  // Mutation to update order status
  const updateStatus = useMutation({
    mutationFn: (status: string) => ordersApi.updateStatus(id!, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['business-orders'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'فشل تحديث حالة الطلب.';
      Alert.alert('خطأ', msg);
    },
  });

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

        {/* Info */}
        <View style={styles.infoCard}>
          <Info label="المنطقة" value={`${order.customer?.area?.name || 'المصيون'}`} />
          <Info label="طريقة الدفع" value={order.paymentMethod === 'CASH' ? 'نقدي عند الاستلام' : 'دفع إلكتروني'} />
          <Info label="الإجمالي" value={`${order.total} ₪`} bold />
        </View>
      </ScrollView>

      {/* Footer transitions */}
      <View style={styles.footer}>
        {status === 'PENDING' ? (
          <View style={styles.btnRow}>
            <Button
              title="رفض"
              variant="danger"
              style={{ flex: 1 }}
              onPress={() => updateStatus.mutate('CANCELLED')}
              disabled={updateStatus.isPending}
            />
            <Button
              title="قبول الطلب"
              style={{ flex: 1 }}
              onPress={() => updateStatus.mutate('CONFIRMED')}
              disabled={updateStatus.isPending}
            />
          </View>
        ) : status === 'CONFIRMED' ? (
          <Button
            title="بدء التحضير"
            onPress={() => updateStatus.mutate('PREPARING')}
            disabled={updateStatus.isPending}
          />
        ) : status === 'PREPARING' ? (
          <Button
            title="الطلب جاهز ✅"
            onPress={() => updateStatus.mutate('READY')}
            disabled={updateStatus.isPending}
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
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  infoValue: { color: colors.textPrimary, fontSize: fontSizes.base },
  footer: { padding: spacing[4], backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
  btnRow: { flexDirection: 'row', gap: spacing[3] },
  completedState: { alignItems: 'center', paddingVertical: 12 },
  completedText: { fontSize: fontSizes.base, fontFamily: fontFamily.bold, color: colors.textMuted },
});
