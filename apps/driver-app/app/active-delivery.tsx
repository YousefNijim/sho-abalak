import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@shu/ui-components/native';
import { ordersApi } from '@shu/api-client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, fontFamily, radius, spacing } from '../src/theme';

const STEPS = ['استلام من المنشأة', 'في الطريق', 'تسليم للزبون'];

export default function ActiveDelivery() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const insets = useSafeAreaInsets();

  // Local step counter — pure UX (no API call for steps 0→1, only step 2 delivers)
  const [step, setStep] = useState(0);
  // Ref guard: blocks double-taps before React re-render flips state
  const advancing = useRef(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getById(orderId!),
    enabled: !!orderId,
    refetchInterval: 5000,
  });

  const deliverMutation = useMutation({
    mutationFn: () => ordersApi.updateStatus(orderId!, { status: 'DELIVERED' }),
    onSuccess: () => {
      advancing.current = false;
      queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      Alert.alert('نجاح', 'تم توصيل الطلب بنجاح وتأكيد التحصيل!');
      router.replace('/(tabs)');
    },
    onError: (err: any) => {
      advancing.current = false;
      const msg = err.response?.data?.message || 'فشل تحديث حالة الطلب إلى تم التسليم.';
      Alert.alert('خطأ', msg);
    },
  });

  const handleAdvanceStep = () => {
    // Ref guard: if a tap is already being processed, ignore this one
    if (advancing.current) return;
    advancing.current = true;
    setStep((s) => {
      const next = s + 1;
      // Release lock on next frame after state update settles
      requestAnimationFrame(() => { advancing.current = false; });
      return next;
    });
  };

  const handleDeliver = () => {
    if (advancing.current || deliverMutation.isPending) return;
    advancing.current = true;
    if (Platform.OS === 'web') {
      if (window.confirm('هل أنت متأكد أن الطلب وصل للزبون؟')) {
        deliverMutation.mutate();
      } else {
        advancing.current = false;
      }
      return;
    }
    Alert.alert(
      'تأكيد التسليم',
      'هل أنت متأكد أن الطلب وصل للزبون؟',
      [
        {
          text: 'إلغاء',
          style: 'cancel',
          onPress: () => { advancing.current = false; },
        },
        {
          text: 'نعم، تم التسليم',
          onPress: () => deliverMutation.mutate(),
        },
      ]
    );
  };

  const handleCall = (phone: string | undefined) => {
    if (!phone) { Alert.alert('خطأ', 'رقم الهاتف غير متوفر'); return; }
    Linking.openURL(`tel:${phone}`);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text style={{ fontSize: fontSizes.base, color: colors.textMuted, textAlign: 'center' }}>
          لم يتم العثور على تفاصيل هذا الطلب.
        </Text>
        <Button title="العودة للرئيسية" style={{ marginTop: spacing[4] }} onPress={() => router.replace('/(tabs)')} />
      </View>
    );
  }

  const itemsCount = order.items?.reduce((acc: number, it: any) => acc + it.quantity, 0) ?? 0;
  const isCash = order.paymentMethod === 'CASH';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Full-screen overlay while delivering — blocks all interaction */}
      <Modal visible={deliverMutation.isPending} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.overlayText}>جاري تأكيد التسليم...</Text>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: spacing[4] }}>
        {/* Stepper */}
        <View style={styles.stepper}>
          {STEPS.map((s, i) => (
            <View key={s} style={styles.stepItem}>
              <View style={[styles.stepDot, i <= step && styles.stepDotActive]}>
                <Text style={[styles.stepNum, i <= step && { color: '#fff' }]}>{i + 1}</Text>
              </View>
              <Text style={styles.stepLabel}>{s}</Text>
            </View>
          ))}
        </View>

        {/* Business Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>📍 المنشأة (نقطة الاستلام)</Text>
          </View>
          <Text style={styles.nameText}>{order.business?.name}</Text>
          <Text style={styles.muted}>
            العنوان: {order.business?.area?.city} - {order.business?.area?.name}
          </Text>
          {order.business?.owner?.phone ? (
            <Text style={styles.muted}>هاتف: {order.business.owner.phone}</Text>
          ) : null}
          <Pressable style={styles.callBtn} onPress={() => handleCall(order.business?.owner?.phone)}>
            <Text style={styles.callText}>📞 اتصال بالمنشأة</Text>
          </Pressable>
        </View>

        {/* Order Items Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📦 محتويات الطلب ({itemsCount} عناصر)</Text>
          <View style={styles.itemsList}>
            {order.items?.map((it: any) => (
              <View key={it.id} style={styles.itemRow}>
                <Text style={styles.itemQty}>x{it.quantity}</Text>
                <Text style={styles.itemName}>{it.product?.name}</Text>
              </View>
            ))}
          </View>
          {order.note ? (
            <View style={styles.noteContainer}>
              <Text style={styles.noteTitle}>📝 ملاحظات الزبون:</Text>
              <Text style={styles.noteText}>{order.note}</Text>
            </View>
          ) : null}
        </View>

        {/* Customer Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>👤 الزبون (نقطة التسليم)</Text>
          </View>
          <Text style={styles.nameText}>{order.customer?.name || 'زبون شو عبالك'}</Text>
          <View style={styles.deliveryAddressBlock}>
            <Text style={styles.deliveryAddressLabel}>عنوان التوصيل</Text>
            <Text style={styles.deliveryAreaName}>
              {order.deliveryAreaName || order.customer?.area?.name || 'المنطقة'}
            </Text>
            {!!order.deliveryAddressDetail && (
              <Text style={styles.deliveryAddressDetail}>{order.deliveryAddressDetail}</Text>
            )}
          </View>
          {order.customer?.phone ? (
            <Text style={styles.muted}>هاتف: {order.customer.phone}</Text>
          ) : null}
          <Pressable style={styles.callBtn} onPress={() => handleCall(order.customer?.phone)}>
            <Text style={styles.callText}>📞 اتصال بالزبون</Text>
          </Pressable>
        </View>

        {/* Cash vs Electronic Callout */}
        <View style={[styles.cashCallout, !isCash && styles.electronicCallout]}>
          <Text style={[styles.cashText, !isCash && styles.electronicText]}>
            {isCash
              ? `💵 استلم ${order.total} ₪ من الزبون (نقدي)`
              : `💳 تم الدفع إلكترونياً بقيمة ${order.total} ₪ (لا تستلم كاش!)`}
          </Text>
        </View>
      </ScrollView>

      {/* Footer — only ONE actionable button at a time */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing[4]) }]}>
        {step === 0 && (
          <Button
            title="استلمت الطلب وبدء التحرك 🛵"
            onPress={handleAdvanceStep}
          />
        )}
        {step === 1 && (
          <Button
            title="وصلت لموقع الزبون 📍"
            onPress={handleAdvanceStep}
          />
        )}
        {step === 2 && (
          <Button
            title="تأكيد تسليم الطلب بنجاح ✅"
            variant="primary"
            disabled={deliverMutation.isPending}
            onPress={handleDeliver}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing[4] },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  overlayCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[6], alignItems: 'center', gap: spacing[3], minWidth: 200 },
  overlayText: { fontFamily: fontFamily.bold, fontSize: fontSizes.base, color: colors.textPrimary, textAlign: 'center' },
  stepper: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border },
  stepItem: { alignItems: 'center', flex: 1, gap: 6 },
  stepDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: colors.primary },
  stepNum: { fontFamily: fontFamily.bold, color: colors.textMuted },
  stepLabel: { fontSize: fontSizes.xs, color: colors.textPrimary, textAlign: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, gap: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: fontSizes.base, fontFamily: fontFamily.bold, color: colors.textPrimary, textAlign: 'right' },
  nameText: { fontSize: fontSizes.base, fontFamily: fontFamily.extrabold, color: colors.primary, textAlign: 'right', marginVertical: 2 },
  muted: { color: colors.textMuted, fontSize: fontSizes.sm, textAlign: 'right' },
  callBtn: { backgroundColor: colors.secondary, borderRadius: radius.full, paddingHorizontal: spacing[4], paddingVertical: spacing[2], alignSelf: 'flex-start', marginTop: spacing[2] },
  callText: { color: '#fff', fontFamily: fontFamily.bold, fontSize: fontSizes.sm },
  itemsList: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing[2], marginTop: spacing[1], gap: spacing[2] },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontSize: fontSizes.sm, color: colors.textPrimary, textAlign: 'right' },
  itemQty: { fontSize: fontSizes.sm, fontFamily: fontFamily.bold, color: colors.primary },
  noteContainer: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing[3], marginTop: spacing[2] },
  noteTitle: { fontSize: fontSizes.xs, fontFamily: fontFamily.bold, color: colors.textPrimary, textAlign: 'right' },
  noteText: { fontSize: fontSizes.xs, color: colors.textMuted, textAlign: 'right', marginTop: 2 },
  cashCallout: { backgroundColor: '#FEF9C3', borderRadius: radius.md, padding: spacing[4], borderWidth: 1, borderColor: '#FEF08A' },
  cashText: { color: '#854D0E', fontFamily: fontFamily.bold, fontSize: fontSizes.base, textAlign: 'center' },
  electronicCallout: { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' },
  electronicText: { color: '#166534' },
  footer: { padding: spacing[4], backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
  deliveryAddressBlock: { backgroundColor: colors.primary + '0D', borderRadius: radius.md, padding: spacing[3], marginVertical: spacing[2], borderWidth: 1, borderColor: colors.primary + '30' },
  deliveryAddressLabel: { fontFamily: fontFamily.semibold, fontSize: fontSizes.xs, color: colors.primary, textAlign: 'right', marginBottom: 4 },
  deliveryAreaName: { fontFamily: fontFamily.bold, fontSize: fontSizes.base, color: colors.textPrimary, textAlign: 'right' },
  deliveryAddressDetail: { fontFamily: fontFamily.regular, fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'right', marginTop: 2 },
});
