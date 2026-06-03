import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Platform, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, X, CheckCircle, Utensils, Bike, Home, Phone, Star, MessageCircle } from 'lucide-react-native';
import { colors, fontSizes, fontFamily, radius, spacing } from '../src/theme';
import { Button } from '@shu/ui-components/native';
import { ordersApi, reviewsApi } from '@shu/api-client';
import { useSocket } from '../src/hooks/useSocket';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useActiveOrderStore } from '../src/stores/active-order.store';

const STEPS = [
  { status: 'PENDING', label: 'تم استلام الطلب', desc: 'بانتظار التأكيد', icon: CheckCircle },
  { status: 'CONFIRMED', label: 'تم تأكيد الطلب', desc: 'تم قبول طلبك', icon: CheckCircle },
  { status: 'PREPARING', label: 'يتم تحضير الطعام الآن', desc: 'المطعم يقوم بتجهيز وجبتك', icon: Utensils },
  { status: 'PICKED_UP', label: 'في الطريق إليك', desc: 'السائق في الطريق', icon: Bike },
  { status: 'DELIVERED', label: 'تم التوصيل', desc: 'شكراً لاستخدامك خدمتنا', icon: Home },
] as const;

export default function Tracking() {
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

  if (!id) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIconWrap}>
          <MapPin size={40} color={colors.primary} />
        </View>
        <Text style={styles.errorTitle}>لا يوجد طلب لتتبعه</Text>
        <Text style={styles.errorDesc}>تصفح طلباتك السابقة لمتابعة حالة أي طلب نشط.</Text>
        <Button title="الذهاب للطلبات" onPress={() => router.replace('/(tabs)/orders')} />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.errorContainer}>
        <View style={[styles.errorIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
          <MapPin size={40} color={colors.error} />
        </View>
        <Text style={[styles.errorTitle, { color: colors.error }]}>فشل تحميل تفاصيل الطلب</Text>
        <Button title="تحديث" onPress={() => router.replace('/(tabs)')} />
      </View>
    );
  }

  // Get current status index
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

  // Rating modal state
  const [ratingVisible, setRatingVisible] = useState(false);
  const [businessRating, setBusinessRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [comment, setComment] = useState('');
  const ratingShownRef = useRef(false);

  // Show rating modal once when order is delivered and not yet rated
  useEffect(() => {
    if (
      order?.status === 'DELIVERED' &&
      !order?.review &&
      !ratingShownRef.current
    ) {
      ratingShownRef.current = true;
      // Small delay so the delivered state renders first
      setTimeout(() => setRatingVisible(true), 800);
    }
  }, [order?.status, order?.review]);

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

  const handleCallDriver = () => {
    if (order.driver?.user?.phone) {
      Linking.openURL(`tel:${order.driver.user.phone}`);
    } else {
      Alert.alert('تنبيه', 'رقم السائق غير متوفر');
    }
  };

  const orderTime = new Date(order.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.container}>
      {/* Rating Modal */}
      <Modal visible={ratingVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>قيّم تجربتك 🌟</Text>
            <Text style={styles.modalSubtitle}>طلبك من {order?.business?.name}</Text>

            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>جودة المنتجات</Text>
              <StarRow value={businessRating} onChange={setBusinessRating} />
            </View>

            {order?.driver && (
              <View style={styles.ratingSection}>
                <Text style={styles.ratingLabel}>سرعة التوصيل</Text>
                <StarRow value={deliveryRating} onChange={setDeliveryRating} />
              </View>
            )}

            <TextInput
              style={styles.commentInput}
              placeholder="اكتب اقتراحاتك أو ملاحظاتك (اختياري)"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={comment}
              onChangeText={setComment}
              textAlign="right"
            />

            <View style={styles.modalBtns}>
              <Pressable
                style={styles.skipBtn}
                onPress={() => setRatingVisible(false)}
              >
                <Text style={styles.skipText}>تخطي</Text>
              </Pressable>
              <Pressable
                style={[styles.submitBtn, businessRating === 0 && { opacity: 0.4 }]}
                disabled={businessRating === 0 || submitReview.isPending}
                onPress={() => submitReview.mutate()}
              >
                {submitReview.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitText}>إرسال التقييم</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      {/* TopAppBar */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <View style={styles.headerRight}>
          <View style={styles.storeIconWrap}>
            <Text style={{ fontSize: 20 }}>🏪</Text>
          </View>
          <Text style={styles.headerTitle}>طلبك من {order.business?.name || 'المنشأة'}</Text>
        </View>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <X size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing[8] }]} showsVerticalScrollIndicator={false}>
        
        {/* Cancelled Banner */}
        {isCancelled && (
          <View style={styles.cancelledBanner}>
            <Text style={styles.cancelledText}>تم إلغاء هذا الطلب</Text>
          </View>
        )}

        {/* Live Status Card */}
        {!isCancelled && (
          <View style={styles.card}>
            <View style={styles.statusHeaderRow}>
              <View style={styles.orderIdBadge}>
                <Text style={styles.orderIdText}>رقم الطلب: #{order.id.slice(-5).toUpperCase()}</Text>
              </View>
              <Text style={styles.timeElapsedText}>منذ قليل</Text>
            </View>

            {/* Vertical Stepper */}
            <View style={styles.stepperContainer}>
              {STEPS.map((step, idx) => {
                const isDone = currentIdx > idx;
                const isActive = currentIdx === idx;
                const isPending = currentIdx < idx;
                
                let iconBg: string = 'rgba(229, 224, 213, 1)'; // border-beige
                let iconColor: string = colors.textMuted;
                let titleColor: string = colors.textMuted;

                if (isDone) {
                  iconBg = '#22C55E'; // success-green
                  iconColor = '#fff';
                  titleColor = colors.textPrimary;
                } else if (isActive) {
                  iconBg = '#F59E0B'; // warning-amber
                  iconColor = '#fff';
                  titleColor = colors.primary;
                }

                const StepIcon = step.icon;

                return (
                  <View key={step.status} style={styles.stepItem}>
                    <View style={styles.stepIndicator}>
                      {isActive ? (
                        <Animated.View style={[styles.stepIconWrap, { backgroundColor: iconBg, transform: [{ scale: pulseAnim }] }]}>
                          <StepIcon size={18} color={iconColor} />
                        </Animated.View>
                      ) : (
                        <View style={[styles.stepIconWrap, { backgroundColor: iconBg }]}>
                          <StepIcon size={18} color={iconColor} />
                        </View>
                      )}
                      
                      {idx < STEPS.length - 1 && (
                        <View style={[styles.stepperLine, { backgroundColor: isDone ? '#22C55E' : 'rgba(229, 224, 213, 1)' }]} />
                      )}
                    </View>
                    
                    <View style={styles.stepContent}>
                      <Text style={[styles.stepTitle, { color: titleColor }]}>{step.label}</Text>
                      <Text style={styles.stepDesc}>{idx === 0 ? orderTime : step.desc}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Driver Info Section */}
        {!isCancelled && (order.status === 'PICKED_UP' || order.status === 'DELIVERED') && (
          <View style={[styles.card, styles.driverCard]}>
            <View style={styles.driverHeader}>
              <View style={styles.driverAvatarContainer}>
                <Image
                  source={{ uri: (order.driver?.user as any)?.imageUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuB7RWnmp356XctRFq8IaDwf9mZFD2CI8vQU6irfySg76nVBQM-osy8mC_4tZ46PR1w6UrSogFcqK4SW8C-SgcA9QuhNSLZb-qAKOUsG729Px1PaGcG2agF-gYdbgE-lKimworGyaYr9xwwOn0WbQOUG-P26uHlqYHPnqA2elcFWLq62OzHz1XDE2tiixg1MYxFnEK2FHAz8Ddj7b-nEV5yDNCjm81DRpX2IxfyS0e4MuKUTdwTAKvd01zfva_9mbQDUwOlngJD2hYkM' }}
                  style={styles.driverAvatar}
                  contentFit="cover"
                />
                <View style={styles.onlineDot} />
              </View>
              
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{order.driver?.user?.name || 'سائق التوصيل'}</Text>
                <View style={styles.ratingRow}>
                  <Star size={14} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.ratingText}>4.9 (120+ تقييم)</Text>
                </View>
              </View>
              
              <Pressable style={styles.callBtn} onPress={handleCallDriver}>
                <Phone size={24} color="#fff" />
              </Pressable>
            </View>
            
            <View style={styles.driverFooter}>
              <View style={styles.vehicleRow}>
                <Bike size={20} color={colors.primary} />
                <Text style={styles.vehicleText}>نوع المركبة: دراجة نارية</Text>
              </View>
              <Pressable style={styles.msgBtn}>
                <Text style={styles.msgBtnText}>مراسلة</Text>
                <MessageCircle size={18} color={colors.primary} />
              </Pressable>
            </View>
          </View>
        )}

        {/* Map Placeholder */}
        {!isCancelled && order.status === 'PICKED_UP' && (
          <View style={styles.mapCard}>
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAUrOVW5pZb3qDHPCQqs3nTPOCPbSGgFvexRX9JuQy549aAx_f6V3OhMPK2CPp6WL24_yrJQlPSnNUB34gDOLZJJNazJRYwudHdmeRPBgxPXZtYrGXNDtqtVe2Gc1R3mB_W6ulthH7-BQ1QM962zvwEr6v9G3Ss_FCKoYZsooqQI8tsJjbEbyraZ0gVUyGN_GmAiGWjFT1xITRq2zBH7gPGlT8B8wC8zIEiShfUx00HeUQmhLXTMwa-zkEmcJDPtdTXXNFj1rfi-4Mj' }}
              style={styles.mapImage}
              contentFit="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.4)']}
              style={styles.mapOverlay}
            >
              <View style={styles.mapBadge}>
                <MapPin size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.mapBadgeText}>السائق على بعد 2.4 كم منك</Text>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Delivery address */}
        {(order.deliveryAreaName || order.deliveryAddressDetail) && (
          <View style={styles.deliveryCard}>
            <View style={styles.deliveryCardHeader}>
              <MapPin size={16} color={colors.primary} />
              <Text style={styles.deliveryCardTitle}>عنوان التوصيل</Text>
            </View>
            {order.deliveryAreaName && (
              <Text style={styles.deliveryAreaName}>{order.deliveryAreaName}</Text>
            )}
            {order.deliveryAddressDetail && (
              <Text style={styles.deliveryAddressDetail}>{order.deliveryAddressDetail}</Text>
            )}
          </View>
        )}

        {/* Order Summary (Glassmorphism style) */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>تفاصيل الطلب</Text>
          
          {order.items?.map((it: any) => (
            <View key={it.id} style={styles.summaryRow}>
              <Text style={styles.summaryItemText}>{it.product?.name} × {it.quantity}</Text>
              <Text style={styles.summaryItemText}>₪ {it.unitPrice * it.quantity}</Text>
            </View>
          ))}
          
          <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryTotalLabel}>المجموع الكلي</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#FCF3DC', // background-cream
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    backgroundColor: '#FCF3DC',
    zIndex: 50,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
      android: { elevation: 2 },
      web: { boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    }),
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  storeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(230, 120, 30, 0.2)', // primary-container/20
    borderWidth: 1,
    borderColor: 'rgba(151, 72, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.semibold, // headline-sm
    fontSize: 20,
    color: colors.primary,
  },
  closeBtn: {
    padding: spacing[2],
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
    gap: spacing[6],
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing[4],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  orderIdBadge: {
    backgroundColor: 'rgba(230, 120, 30, 0.1)',
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  orderIdText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.primary,
  },
  timeElapsedText: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
  stepperContainer: {
    flexDirection: 'column',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[4],
    minHeight: 60,
  },
  stepIndicator: {
    alignItems: 'center',
    width: 32,
  },
  stepIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepperLine: {
    width: 2,
    flexGrow: 1,
    minHeight: 28,
  },
  stepContent: {
    flex: 1,
    paddingBottom: spacing[4],
    alignItems: 'flex-end', // RTL
  },
  stepTitle: {
    fontFamily: fontFamily.semibold, // headline-sm
    fontSize: 16,
    textAlign: 'right',
  },
  stepDesc: {
    fontFamily: fontFamily.regular, // body-base
    fontSize: 11, // label-sm
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'right',
  },
  driverCard: {
    borderWidth: 1,
    borderColor: 'rgba(151, 72, 0, 0.05)',
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  driverAvatarContainer: {
    position: 'relative',
  },
  driverAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#ffdbc7', // primary-fixed
  },
  onlineDot: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 16,
    height: 16,
    backgroundColor: '#22C55E',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  driverInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  driverName: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  callBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#22C55E', // success-green
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#22C55E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  driverFooter: {
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: 'rgba(229, 224, 213, 1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  vehicleText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  msgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  msgBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.primary,
  },
  mapCard: {
    position: 'relative',
    height: 224,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: '#e4e1eb', // surface-variant
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
    justifyContent: 'flex-end',
    padding: spacing[4],
    flexDirection: 'row', // Align badge to right? Actually the design shows it just in the bottom.
  },
  mapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    alignSelf: 'flex-start', // to not stretch
  },
  mapBadgeText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: radius.xl,
    padding: spacing[4],
    gap: spacing[3],
    // Glassmorphism effect requires special handling in RN, but we approximate it with semi-transparent bg.
    // In actual Expo we might use BlurView, but simple translucent bg works fine for this step.
  },
  summaryTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: spacing[2],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryItemText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: 'rgba(151, 72, 0, 0.1)',
  },
  summaryTotalLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  summaryTotalValue: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    color: colors.primary,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#FCF3DC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  errorIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(151, 72, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[5],
  },
  errorTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: spacing[2],
  },
  errorDesc: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  cancelledBanner: {
    backgroundColor: '#fee2e2',
    padding: spacing[4],
    borderRadius: radius.lg,
  },
  cancelledText: {
    fontFamily: fontFamily.bold,
    color: '#EF4444',
    textAlign: 'center',
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: '#FCF3DC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[1],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  deliveryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  deliveryCardTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSizes.sm,
    color: colors.primary,
    textAlign: 'right',
  },
  deliveryAreaName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  deliveryAddressDetail: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'right',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing[6],
    gap: spacing[4],
  },
  modalTitle: {
    fontFamily: fontFamily.extrabold,
    fontSize: fontSizes['2xl'],
    color: colors.textPrimary,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.base,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: -spacing[2],
  },
  ratingSection: {
    gap: spacing[2],
  },
  ratingLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  commentInput: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing[3],
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalBtns: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  skipBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  skipText: {
    fontFamily: fontFamily.semibold,
    color: colors.textMuted,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  submitText: {
    fontFamily: fontFamily.bold,
    color: '#fff',
  },
});
