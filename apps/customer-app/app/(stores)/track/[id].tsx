import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Platform, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, X, CheckCircle, Package, Bike, Home, Phone, Star, MessageCircle, Store } from 'lucide-react-native';
import { Button } from '@shu/ui-components/native';
import { ordersApi, reviewsApi, BASE_URL } from '@shu/api-client';
import { useSocket } from '../../../src/hooks/useSocket';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActiveOrderStore } from '../../../src/stores/active-order.store';
import { fontFamily, spacing } from '../../../src/theme';

// Store specific colors
const storeColors = {
  background: '#FCF3DC',
  surface: '#ffffff',
  primary: '#974800',
  primaryContainer: '#e6781e',
  secondary: '#296a43',
  textPrimary: '#1b1b22',
  textMuted: '#564337',
  border: '#e4e1eb',
  success: '#22C55E',
  error: '#ba1a1a',
  white: '#ffffff',
};

const STEPS = [
  { status: 'PENDING', label: 'تم استلام الطلب', desc: 'بانتظار تأكيد المتجر', icon: CheckCircle },
  { status: 'CONFIRMED', label: 'تم تأكيد الطلب', desc: 'أكّد المتجر طلبك', icon: CheckCircle },
  { status: 'PREPARING', label: 'تجهيز المشتريات', desc: 'يجهّز المتجر طلبك', icon: Package },
  { status: 'PICKED_UP', label: 'في الطريق إليك', desc: 'طلبك في الطريق', icon: Bike },
  { status: 'DELIVERED', label: 'تم التوصيل', desc: 'تم توصيل طلبك بنجاح', icon: Home },
] as const;

const mediaUrl = (path: string | null | undefined): string | null =>
  !path ? null : path.startsWith('http') ? path : `${BASE_URL}${path}`;

export default function StoreTracking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const socket = useSocket();
  const setActiveOrder = useActiveOrderStore((s) => s.set);
  const clearActiveOrder = useActiveOrderStore((s) => s.clear);

  // Animation for active step
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ])
    ).start();
  }, [pulseAnim]);

  // Poll order status every 30 seconds as a heartbeat fallback; sockets handle instant updates
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(id!),
    enabled: !!id,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!socket || !id) return;
    const handleStatusUpdate = (payload: { orderId: string; status: string }) => {
      if (payload.orderId === id) {
        queryClient.invalidateQueries({ queryKey: ['order', id] });
      }
    };
    socket.on('order:status_update', handleStatusUpdate);
    return () => {
      socket.off('order:status_update', handleStatusUpdate);
    };
  }, [socket, id, queryClient]);

  // Keep global active-order store in sync so the Home banner stays current
  useEffect(() => {
    if (!order) return;
    const terminal = order.status === 'DELIVERED' || order.status === 'CANCELLED';
    if (terminal) {
      clearActiveOrder();
    } else {
      setActiveOrder({
        id: order.id,
        businessName: order.business?.name ?? '',
        status: order.status,
        total: Number(order.total),
      });
    }
  }, [order, setActiveOrder, clearActiveOrder]);

  // Rating modal state — must be before any early returns (Rules of Hooks)
  const [ratingVisible, setRatingVisible] = useState(false);
  const [businessRating, setBusinessRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [comment, setComment] = useState('');
  const ratingShownRef = useRef(false);

  useEffect(() => {
    if (order?.status === 'DELIVERED' && !order?.review && !ratingShownRef.current) {
      ratingShownRef.current = true;
      setTimeout(() => setRatingVisible(true), 800);
    }
  }, [order?.status, order?.review]);

  const cancelOrder = useMutation({
    mutationFn: () => ordersApi.updateStatus(order!.id, { status: 'CANCELLED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      clearActiveOrder();
    },
    onError: () => {
      Alert.alert('خطأ', 'فشل إلغاء الطلب، يرجى المحاولة مجدداً');
    },
  });

  const handleCancelOrder = () => {
    Alert.alert(
      'إلغاء الطلب',
      'هل أنت متأكد من إلغاء الطلب؟',
      [
        { text: 'لا', style: 'cancel' },
        {
          text: 'نعم، إلغاء',
          style: 'destructive',
          onPress: () => cancelOrder.mutate(),
        },
      ],
    );
  };

  const submitReview = useMutation({
    mutationFn: () =>
      reviewsApi.create({
        orderId: order!.id,
        businessRating,
        deliveryRating: deliveryRating > 0 ? deliveryRating : undefined,
        comment: comment.trim() || undefined,
      }),
    onSuccess: () => {
      setRatingVisible(false);
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      Alert.alert('شكراً لك! 🌟', 'تم إرسال تقييمك بنجاح');
    },
    onError: () => {
      Alert.alert('خطأ', 'فشل إرسال التقييم، يرجى المحاولة مجدداً');
    },
  });

  if (!id) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIconWrap}>
          <MapPin size={40} color={storeColors.primary} />
        </View>
        <Text style={styles.errorTitle}>لا يوجد طلب لتتبعه</Text>
        <Text style={styles.errorDesc}>تصفح طلباتك السابقة لمتابعة حالة أي طلب نشط.</Text>
        <Button title="الذهاب للطلبات" onPress={() => router.replace('/(stores)/orders')} />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={storeColors.primary} />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.errorContainer}>
        <View style={[styles.errorIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
          <MapPin size={40} color={storeColors.error} />
        </View>
        <Text style={[styles.errorTitle, { color: storeColors.error }]}>فشل تحميل تفاصيل الطلب</Text>
        <Button title="تحديث" onPress={() => router.replace('/(stores)')} />
      </View>
    );
  }

  const getStatusIndex = (status: string) => {
    switch (status) {
      case 'PENDING': return 0;
      case 'CONFIRMED': return 1;
      case 'PREPARING':
      case 'READY': return 2;
      case 'PICKED_UP': return 3;
      case 'DELIVERED': return 4;
      default: return -1;
    }
  };

  const currentIdx = getStatusIndex(order.status);
  const isCancelled = order.status === 'CANCELLED';

  const handleCallDriver = () => {
    if (order.driver?.user?.phone) {
      Linking.openURL(`tel:${order.driver.user.phone}`);
    } else {
      Alert.alert('تنبيه', 'رقم السائق غير متوفر');
    }
  };

  const handleCallStore = () => {
    if ((order.business as any)?.phone) {
      Linking.openURL(`tel:${(order.business as any).phone}`);
    } else {
      Alert.alert('تنبيه', 'رقم المتجر غير متوفر');
    }
  };

  const orderTime = new Date(order.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.container}>
      {/* Rating Modal */}
      <Modal visible={ratingVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>تقييم التجربة</Text>
              <Pressable onPress={() => setRatingVisible(false)} style={styles.closeBtn}>
                <X size={24} color={storeColors.textMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing[4] }}>
              <Text style={styles.ratingLabel}>كيف كانت تجربتك مع متجر {order.business?.name}؟</Text>
              <StarRow value={businessRating} onChange={setBusinessRating} />

              {(order as any).deliveryMode === 'PLATFORM' && order.driver && (
                <>
                  <Text style={[styles.ratingLabel, { marginTop: spacing[6] }]}>كيف تقيم خدمة التوصيل من السائق {order.driver.user?.name}؟</Text>
                  <StarRow value={deliveryRating} onChange={setDeliveryRating} />
                </>
              )}

              <Text style={[styles.ratingLabel, { marginTop: spacing[6] }]}>ملاحظات إضافية (اختياري)</Text>
              <TextInput
                style={styles.ratingInput}
                multiline
                numberOfLines={3}
                placeholder="أخبرنا عن تجربتك..."
                placeholderTextColor={storeColors.textMuted}
                value={comment}
                onChangeText={setComment}
                textAlign="right"
              />

              <Button
                title="إرسال التقييم"
                onPress={() => submitReview.mutate()}
                loading={submitReview.isPending}
                disabled={businessRating === 0}
                style={{ marginTop: spacing[6], backgroundColor: storeColors.primary }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[4] }]}>
        <Pressable style={styles.closeBtn} onPress={() => router.replace('/(stores)')}>
          <X size={28} color={storeColors.textPrimary} />
        </Pressable>
        <View style={styles.headerRight}>
          <View>
            <Text style={styles.headerTitle}>تتبّع طلب المتجر</Text>
            <Text style={styles.orderIdText}>طلب #{order.id.slice(-5).toUpperCase()}</Text>
          </View>
          <View style={styles.storeIconWrap}>
            <Store size={20} color={storeColors.primaryContainer} />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Status Stepper Card */}
        <View style={styles.card}>
          <View style={styles.statusHeaderRow}>
            {isCancelled ? (
              <View style={styles.cancelledBanner}>
                <Text style={styles.cancelledText}>أُلغي الطلب</Text>
              </View>
            ) : (
              <View>
                <Text style={styles.timeElapsedText}>الطلب أُرسل الساعة {orderTime}</Text>
                {order.status !== 'DELIVERED' && (
                  <Text style={[styles.timeElapsedText, { color: storeColors.primary, marginTop: 4, fontFamily: fontFamily.bold }]}>
                    الوقت المتوقع للتوصيل: {(order.business as any)?.deliveryType === 'SELF' ? '60-90 دقيقة' : '30-45 دقيقة'}
                  </Text>
                )}
              </View>
            )}
            <View style={styles.orderIdBadge}>
              <Text style={styles.orderIdText}>#{order.id.slice(-5).toUpperCase()}</Text>
            </View>
          </View>

          {!isCancelled && (
            <View style={styles.stepperContainer}>
              {STEPS.map((step, idx) => {
                const isCompleted = currentIdx > idx;
                const isActive = currentIdx === idx;
                const Icon = step.icon;
                
                // Color logic
                let bgColor = '#f1f5f9'; // inactive bg
                let iconColor = '#94a3b8'; // inactive icon
                
                if (isCompleted) {
                  bgColor = '#dcfce7'; // green-100
                  iconColor = '#22c55e'; // green-500
                } else if (isActive) {
                  bgColor = 'rgba(230,120,30,0.15)'; // primary-container light
                  iconColor = storeColors.primaryContainer;
                }

                return (
                  <View key={step.status} style={styles.stepItem}>
                    {/* Icon Column */}
                    <View style={styles.stepIndicator}>
                      <Animated.View style={[
                        styles.stepIconWrap, 
                        { backgroundColor: bgColor },
                        isActive && { transform: [{ scale: pulseAnim }] }
                      ]}>
                        <Icon size={16} color={iconColor} strokeWidth={isActive || isCompleted ? 2.5 : 2} />
                      </Animated.View>
                      {idx < STEPS.length - 1 && (
                        <View style={[
                          styles.stepperLine,
                          { backgroundColor: isCompleted ? '#22c55e' : '#e2e8f0' }
                        ]} />
                      )}
                    </View>
                    
                    {/* Content Column */}
                    <View style={styles.stepContent}>
                      <Text style={[styles.stepTitle, { color: isActive || isCompleted ? storeColors.textPrimary : storeColors.textMuted }]}>
                        {step.label}
                      </Text>
                      <Text style={styles.stepDesc}>{step.desc}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Driver / Delivery Info Card */}
        {!isCancelled && order.status !== 'PENDING' && order.status !== 'CONFIRMED' && (
          <View style={[styles.card, styles.driverCard]}>
            <Text style={styles.summaryTitle}>معلومات التوصيل</Text>
            
            {(order as any).deliveryMode === 'PLATFORM' && order.driver ? (
              <>
                <View style={styles.driverHeader}>
                  <Pressable style={styles.callBtn} onPress={handleCallDriver}>
                    <Phone size={24} color="#FFF" />
                  </Pressable>
                  <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{order.driver.user?.name}</Text>
                    <View style={styles.ratingRow}>
                      <Star size={12} color="#F59E0B" fill="#F59E0B" />
                      <Text style={styles.ratingText}>4.9 (120 رحلة)</Text>
                    </View>
                  </View>
                  <View style={styles.driverAvatarContainer}>
                    {(order.driver.user as any)?.imageUrl ? (
                      <Image source={{ uri: mediaUrl((order.driver.user as any).imageUrl)! }} style={styles.driverAvatar} />
                    ) : (
                      <View style={[styles.driverAvatar, { backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }]}>
                        <Bike size={32} color={storeColors.primary} />
                      </View>
                    )}
                    <View style={styles.onlineDot} />
                  </View>
                </View>
                <View style={styles.driverFooter}>
                  <Pressable style={styles.msgBtn}>
                    <MessageCircle size={16} color={storeColors.primary} />
                    <Text style={styles.msgBtnText}>رسالة للسائق</Text>
                  </Pressable>
                  <View style={styles.vehicleRow}>
                    <Text style={styles.vehicleText}>{(order.driver as any).vehicleType === 'CAR' ? 'سيارة' : 'دراجة نارية'}</Text>
                    <Bike size={16} color={storeColors.textMuted} />
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.driverHeader}>
                <Pressable style={styles.callBtn} onPress={handleCallStore}>
                  <Phone size={24} color="#FFF" />
                </Pressable>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>توصيل المتجر ({order.business?.name})</Text>
                  <Text style={styles.ratingText}>مندوب التوصيل الخاص بالمتجر في طريقه إليك</Text>
                </View>
                <View style={[styles.driverAvatar, { backgroundColor: 'rgba(230,120,30,0.1)', alignItems: 'center', justifyContent: 'center' }]}>
                  <Package size={32} color={storeColors.primary} />
                </View>
              </View>
            )}
          </View>
        )}

        {/* Address Info */}
        <View style={styles.card}>
          <Text style={styles.summaryTitle}>عنوان التوصيل</Text>
          <View style={{ alignItems: 'flex-end', marginTop: spacing[2] }}>
            {order.deliveryAreaName && (
              <Text style={{ fontFamily: fontFamily.bold, fontSize: 15, color: storeColors.textPrimary }}>{order.deliveryAreaName}</Text>
            )}
            {order.deliveryAddressDetail && (
              <Text style={{ fontFamily: fontFamily.medium, fontSize: 13, color: storeColors.textMuted, marginTop: 4 }}>{order.deliveryAddressDetail}</Text>
            )}
            <Text style={{ fontFamily: fontFamily.bold, fontSize: 13, color: storeColors.primary, marginTop: spacing[2] }}>طريقة الدفع: {order.paymentMethod === 'CASH' ? 'نقد' : 'إلكتروني'}</Text>
          </View>
        </View>

        {/* Cancel button — only visible while order is still PENDING */}
        {order.status === 'PENDING' && (
          <Pressable
            style={styles.cancelBtn}
            onPress={handleCancelOrder}
            disabled={cancelOrder.isPending}
          >
            {cancelOrder.isPending
              ? <ActivityIndicator color={storeColors.error} />
              : <Text style={styles.cancelBtnText}>إلغاء الطلب</Text>}
          </Pressable>
        )}

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>مشترياتك</Text>
          
          {order.items?.map((it: any) => (
            <View key={it.id} style={styles.summaryRow}>
              <View style={{ alignItems: 'flex-end', flex: 1 }}>
                <Text style={styles.summaryItemText}>{it.product?.name} × {it.quantity}</Text>
                {it.variantName ? (
                  <Text style={styles.summaryItemVariant}>{it.variantName}</Text>
                ) : null}
              </View>
              <Text style={styles.summaryItemText}>₪ {it.unitPrice * it.quantity}</Text>
            </View>
          ))}
          
          <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryTotalLabel}>الإجمالي المدفوع</Text>
            <Text style={styles.summaryTotalValue}>₪ {order.total}</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

function StarRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)}>
          <Star size={36} color="#F59E0B" fill={n <= value ? '#F59E0B' : 'transparent'} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: storeColors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    backgroundColor: storeColors.background,
    zIndex: 50,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  storeIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(230, 120, 30, 0.2)',
    borderWidth: 1, borderColor: 'rgba(151, 72, 0, 0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: fontFamily.bold, fontSize: 18, color: storeColors.primary },
  orderIdText: { fontFamily: fontFamily.medium, fontSize: 13, color: storeColors.primary },
  closeBtn: { padding: spacing[2] },
  
  scrollContent: { paddingHorizontal: spacing[4], paddingTop: spacing[6], gap: spacing[6], paddingBottom: 100 },
  
  card: {
    backgroundColor: storeColors.surface,
    borderRadius: 20,
    padding: spacing[4],
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 }, android: { elevation: 2 } }),
  },
  statusHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[6] },
  orderIdBadge: { backgroundColor: 'rgba(230, 120, 30, 0.1)', paddingHorizontal: spacing[3], paddingVertical: 4, borderRadius: 16 },
  timeElapsedText: { fontFamily: fontFamily.medium, fontSize: 12, color: storeColors.textMuted },
  
  stepperContainer: { flexDirection: 'column' },
  stepItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[4], minHeight: 60 },
  stepIndicator: { alignItems: 'center', width: 32 },
  stepIconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  stepperLine: { width: 2, flexGrow: 1, minHeight: 28 },
  stepContent: { flex: 1, paddingBottom: spacing[4], alignItems: 'flex-end' },
  stepTitle: { fontFamily: fontFamily.bold, fontSize: 15, textAlign: 'right' },
  stepDesc: { fontFamily: fontFamily.medium, fontSize: 12, color: storeColors.textMuted, marginTop: 2, textAlign: 'right' },
  
  driverCard: { borderWidth: 1, borderColor: storeColors.border },
  driverHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  driverAvatarContainer: { position: 'relative' },
  driverAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#ffdbc7' },
  onlineDot: { position: 'absolute', bottom: -4, right: -4, width: 16, height: 16, backgroundColor: storeColors.success, borderRadius: 8, borderWidth: 2, borderColor: '#FFF' },
  driverInfo: { flex: 1, alignItems: 'flex-end' },
  driverName: { fontFamily: fontFamily.bold, fontSize: 16, color: storeColors.textPrimary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText: { fontFamily: fontFamily.medium, fontSize: 12, color: storeColors.textMuted },
  callBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: storeColors.success, alignItems: 'center', justifyContent: 'center' },
  driverFooter: { marginTop: spacing[4], paddingTop: spacing[4], borderTopWidth: 1, borderTopColor: storeColors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  vehicleText: { fontFamily: fontFamily.medium, fontSize: 12, color: storeColors.textMuted },
  msgBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  msgBtnText: { fontFamily: fontFamily.bold, fontSize: 13, color: storeColors.primary },
  
  summaryCard: { backgroundColor: storeColors.surface, borderWidth: 1, borderColor: storeColors.border, borderRadius: 20, padding: spacing[4], gap: spacing[3] },
  summaryTitle: { fontFamily: fontFamily.bold, fontSize: 16, color: storeColors.textPrimary, textAlign: 'right', marginBottom: spacing[2] },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryItemText: { fontFamily: fontFamily.medium, fontSize: 13, color: storeColors.textMuted },
  summaryItemVariant: { fontFamily: fontFamily.medium, fontSize: 11, color: storeColors.textMuted, textAlign: 'right', marginTop: 1 },
  summaryTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing[3], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: storeColors.border },
  summaryTotalLabel: { fontFamily: fontFamily.bold, fontSize: 16, color: storeColors.textPrimary },
  summaryTotalValue: { fontFamily: fontFamily.bold, fontSize: 20, color: storeColors.primary },
  
  cancelBtn: { backgroundColor: 'transparent', paddingVertical: spacing[3], alignItems: 'center', borderWidth: 1, borderColor: storeColors.error, borderRadius: 16, marginHorizontal: spacing[4] },
  cancelBtnText: { fontFamily: fontFamily.bold, fontSize: 15, color: storeColors.error },
  
  errorContainer: { flex: 1, backgroundColor: storeColors.background, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  errorIconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(151, 72, 0, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing[5] },
  errorTitle: { fontFamily: fontFamily.bold, fontSize: 20, color: storeColors.textPrimary, marginBottom: spacing[2] },
  errorDesc: { fontFamily: fontFamily.medium, fontSize: 15, color: storeColors.textMuted, textAlign: 'center', marginBottom: spacing[6] },
  
  cancelledBanner: { backgroundColor: '#fee2e2', padding: spacing[4], borderRadius: 16 },
  cancelledText: { fontFamily: fontFamily.bold, fontSize: 16, color: storeColors.error, textAlign: 'center' },
  
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: storeColors.background },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing[4] },
  modalContent: { width: '100%', backgroundColor: storeColors.surface, borderRadius: 24, padding: spacing[5] },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] },
  modalTitle: { fontFamily: fontFamily.bold, fontSize: 20, color: storeColors.textPrimary },
  ratingLabel: { fontFamily: fontFamily.bold, fontSize: 15, color: storeColors.textPrimary, textAlign: 'center', marginBottom: spacing[4] },
  ratingInput: { backgroundColor: storeColors.background, borderRadius: 16, padding: spacing[4], fontFamily: fontFamily.medium, fontSize: 14, color: storeColors.textPrimary, minHeight: 100, textAlignVertical: 'top', marginTop: spacing[4] },
});
