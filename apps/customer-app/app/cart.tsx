import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Minus, Plus, Trash2, ArrowRight, Banknote, CreditCard, ShoppingBag, MapPin, ChevronLeft } from 'lucide-react-native';
import { Button } from '@shu/ui-components/native';
import { colors, fontSizes, fontFamily, radius, spacing } from '../src/theme';
import { useCartStore } from '../src/stores/cart.store';
import { useActiveOrderStore } from '../src/stores/active-order.store';
import { businessesApi, ordersApi, areasApi } from '@shu/api-client';
import { useAuthStore } from '../src/stores/auth.store';
import type { CreateOrderDto } from '@shu/api-client';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Cart() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const items = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const businessId = useCartStore((s) => s.businessId);
  const areaId = useCartStore((s) => s.areaId);
  const clearCart = useCartStore((s) => s.clear);
  const subtotal = useCartStore((s) => s.total());
  const setActiveOrder = useActiveOrderStore((s) => s.set);

  const user = useAuthStore((s) => s.user);
  const [payment, setPayment] = useState<'CASH' | 'ELECTRONIC'>('CASH');
  const [notes, setNotes] = useState('');
  const [areaPickerVisible, setAreaPickerVisible] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(user?.areaId ?? null);

  const { data: areas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: () => areasApi.list(),
  });

  const selectedArea = areas.find((a: any) => a.id === selectedAreaId);

  // Fetch business details to get the delivery fee
  const { data: business, isLoading: loadingBusiness } = useQuery({
    queryKey: ['business', businessId],
    queryFn: () => businessesApi.getById(businessId!),
    enabled: !!businessId,
  });

  const fee = Number(business?.area?.deliveryFee ?? 0);
  const total = Number(subtotal) + fee;

  // Mutation to create order
  const createOrder = useMutation({
    mutationFn: (dto: CreateOrderDto) => ordersApi.create(dto),
    onSuccess: (data: any) => {
      setActiveOrder({
        id: data.id,
        businessName: business?.name ?? '',
        status: 'PENDING',
        total: Number(data.total),
      });
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      router.replace({
        pathname: '/tracking',
        params: { id: data.id },
      });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'فشل إرسال الطلب. يرجى المحاولة لاحقاً.';
      Alert.alert('خطأ في إرسال الطلب', msg);
    },
  });

  const handleConfirm = () => {
    if (!businessId || !areaId) return;
    createOrder.mutate({
      businessId,
      areaId,
      paymentMethod: payment,
      items: items.map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
      })),
      notes: notes.trim() || undefined,
    } as CreateOrderDto & { notes?: string });
  };

  if (items.length === 0) {
    return (
      <View style={[styles.emptyContainer, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowRight size={28} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>سلّتك</Text>
        </View>
        <View style={styles.emptyWrap}>
          <View style={styles.emptyCircle}>
            <ShoppingCart size={40} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>سلتك فارغة</Text>
          <Text style={styles.emptyDesc}>تصفح الأقسام وأضف بعض المنتجات الشهية والمنوعة لسلتك!</Text>
          <Button title="ابدأ التسوق" onPress={() => router.replace('/(tabs)')} style={styles.emptyBtn} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top : spacing[4] }]}>
        <Text style={styles.headerTitle}>سلّتك</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowRight size={28} color={colors.primary} />
        </Pressable>
      </View>

      {/* Fix 4: Address selector */}
      <Pressable style={styles.addressStrip} onPress={() => setAreaPickerVisible(true)}>
        <ChevronLeft size={18} color={colors.primary} />
        <Text style={styles.addressStripText} numberOfLines={1}>
          {selectedArea ? `${selectedArea.city} — ${selectedArea.name}` : 'اختر منطقة التوصيل'}
        </Text>
        <MapPin size={18} color={colors.primary} />
      </Pressable>

      <Modal visible={areaPickerVisible} transparent animationType="slide" onRequestClose={() => setAreaPickerVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAreaPickerVisible(false)} />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing[4] }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>اختر منطقة التوصيل</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {areas.map((a: any) => (
              <Pressable
                key={a.id}
                style={[styles.areaRow, selectedAreaId === a.id && styles.areaRowActive]}
                onPress={() => { setSelectedAreaId(a.id); setAreaPickerVisible(false); }}
              >
                <MapPin size={16} color={selectedAreaId === a.id ? colors.primary : colors.textMuted} />
                <Text style={[styles.areaText, selectedAreaId === a.id && styles.areaTextActive]}>
                  {a.city} — {a.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cart Items */}
        <View style={styles.itemsSection}>
          {items.map((it) => (
            <View key={it.productId} style={styles.itemCard}>
              <View style={styles.itemImageWrap}>
                {it.imageUrl ? (
                  <Image source={{ uri: it.imageUrl }} style={styles.itemImage} contentFit="cover" />
                ) : (
                  <View style={styles.itemImagePlaceholder}>
                    <Text style={{ fontSize: 32 }}>🍽️</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                  <Pressable onPress={() => removeItem(it.productId)} style={styles.deleteBtn}>
                    <Trash2 size={20} color={colors.error} />
                  </Pressable>
                </View>
                <Text style={styles.itemPrice}>{it.price} ₪</Text>
                
                <View style={styles.itemFooter}>
                  <View style={styles.qtyWrap}>
                    <Pressable style={styles.qtyBtnPlus} onPress={() => updateQty(it.productId, 1)}>
                      <Plus size={18} color={colors.white} />
                    </Pressable>
                    <Text style={styles.qtyText}>{it.quantity}</Text>
                    <Pressable style={styles.qtyBtnMinus} onPress={() => updateQty(it.productId, -1)}>
                      <Minus size={18} color={colors.textPrimary} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Restaurant Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ملاحظات للمطعم</Text>
          <TextInput
            style={styles.notesInput}
            multiline
            placeholder="مثلاً: بدون بصل، صوص زيادة..."
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            textAlign="right"
          />
        </View>

        {/* Payment Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>طريقة الدفع</Text>
          <View style={styles.paymentGrid}>
            <Pressable
              style={[styles.paymentCard, payment === 'CASH' && styles.paymentCardActive]}
              onPress={() => setPayment('CASH')}
            >
              <Banknote size={32} color={payment === 'CASH' ? colors.primary : colors.textMuted} style={styles.paymentIcon} />
              <Text style={[styles.paymentText, payment === 'CASH' && styles.paymentTextActive]}>نقد عند الاستلام</Text>
            </Pressable>
            <Pressable
              style={[styles.paymentCard, payment === 'ELECTRONIC' && styles.paymentCardActive]}
              onPress={() => setPayment('ELECTRONIC')}
            >
              <CreditCard size={32} color={payment === 'ELECTRONIC' ? colors.primary : colors.textMuted} style={styles.paymentIcon} />
              <Text style={[styles.paymentText, payment === 'ELECTRONIC' && styles.paymentTextActive]}>دفع إلكتروني</Text>
            </Pressable>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>المجموع الفرعي</Text>
            <Text style={styles.summaryValueBold}>{subtotal} ₪</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>رسوم التوصيل</Text>
            <Text style={styles.summaryValueBold}>{loadingBusiness ? '...' : `${fee} ₪`}</Text>
          </View>
          <View style={styles.dashedDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>الإجمالي</Text>
            <Text style={styles.summaryTotalValue}>{loadingBusiness ? '...' : `${total} ₪`}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View style={[styles.footer, { paddingBottom: insets.bottom || spacing[4] }]}>
        <View style={styles.footerContent}>
          <Button
            onPress={handleConfirm}
            loading={createOrder.isPending}
            disabled={createOrder.isPending || loadingBusiness}
            style={styles.confirmBtn}
          >
            <View style={styles.confirmBtnContent}>
              <Text style={styles.confirmBtnText}>تأكيد الطلب</Text>
              <ShoppingBag size={24} color={colors.white} />
            </View>
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCF3DC', // background-cream
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    height: 64 + (Platform.OS === 'ios' ? 44 : 0),
    backgroundColor: '#FCF3DC',
    zIndex: 50,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  headerTitle: {
    fontFamily: fontFamily.bold, // headline-sm equivalent
    fontSize: 20,
    color: colors.primary,
  },
  backBtn: {
    padding: spacing[2],
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
    gap: spacing[6],
  },
  itemsSection: {
    gap: spacing[3],
  },
  itemCard: {
    backgroundColor: '#FFFFFF', // surface-white
    borderRadius: radius.lg, // 12px or 16px
    padding: spacing[3],
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing[3],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  itemImageWrap: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(229, 224, 213, 1)', // border-beige
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemName: {
    fontFamily: fontFamily.semibold, // headline-sm
    fontSize: 16,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  deleteBtn: {
    padding: 2,
  },
  itemPrice: {
    fontFamily: fontFamily.bold,
    color: colors.primary,
    marginTop: 4,
    textAlign: 'right',
  },
  itemFooter: {
    marginTop: spacing[2],
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qtyWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#efecf6', // surface-container
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    gap: spacing[3],
  },
  qtyBtnPlus: {
    width: 32,
    height: 32,
    backgroundColor: colors.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontFamily: fontFamily.bold, // body-base
    fontSize: 15,
    color: colors.textPrimary,
  },
  qtyBtnMinus: {
    width: 32,
    height: 32,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(138, 114, 101, 1)', // outline
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: spacing[2],
  },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    color: colors.textPrimary,
    paddingHorizontal: 4,
    textAlign: 'right',
  },
  notesInput: {
    height: 96,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(229, 224, 213, 1)', // border-beige
    borderRadius: radius.lg,
    padding: spacing[4],
    fontFamily: fontFamily.regular,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  paymentGrid: {
    flexDirection: 'row-reverse',
    gap: spacing[3],
  },
  paymentCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: radius.lg,
    padding: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  paymentCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#ffdbc7', // primary-fixed
  },
  paymentIcon: {
    marginBottom: 4,
  },
  paymentText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textMuted, // on-surface-variant
  },
  paymentTextActive: {
    color: colors.primary,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing[4],
    gap: spacing[3],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  summaryRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 15, // body-base
    color: colors.textMuted, // on-surface-variant
  },
  summaryValueBold: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  dashedDivider: {
    height: 1,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229, 224, 213, 1)', // border-beige
    borderStyle: 'dashed',
    marginVertical: spacing[2],
  },
  summaryTotalLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 20, // headline-sm
    color: colors.textPrimary,
  },
  summaryTotalValue: {
    fontFamily: fontFamily.semibold,
    fontSize: 20, // headline-sm
    color: colors.primary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 10 },
      web: { boxShadow: '0 -4px 10px rgba(0,0,0,0.05)' },
    }),
    zIndex: 50,
  },
  footerContent: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  confirmBtn: {
    width: '100%',
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  confirmBtnContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  confirmBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 16, // button-text
    color: colors.white,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#FCF3DC',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  emptyCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(151, 72, 0, 0.1)', // primary with opacity
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[5],
  },
  emptyTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 24, // headline-md
    color: colors.textPrimary,
    marginBottom: spacing[2],
  },
  emptyDesc: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  emptyBtn: {
    paddingHorizontal: spacing[8],
  },
  addressStrip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  addressStripText: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing[4],
    maxHeight: '60%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing[4],
  },
  modalTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: spacing[3],
  },
  areaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderRadius: radius.md,
  },
  areaRowActive: {
    backgroundColor: colors.primary + '15',
  },
  areaText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  areaTextActive: {
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },
});
