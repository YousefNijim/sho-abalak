import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View, TextInput, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Minus, Plus, Trash2, ArrowRight, Banknote, MapPin, ChevronDown, Home as HomeIcon, Check, Tag, X, Store } from 'lucide-react-native';
import { Button } from '@shu/ui-components/native';
import { fontFamily, spacing } from '../../src/theme';
import { useStoreCartStore } from '../../src/stores/storeCart.store';
import { useActiveOrderStore } from '../../src/stores/active-order.store';
import { useAuthStore } from '../../src/stores/auth.store';
import { businessesApi, ordersApi, addressesApi, couponsApi, BASE_URL } from '@shu/api-client';
import { useSavedAddressesStore } from '../../src/stores/saved-addresses.store';
import type { CreateOrderDto, CouponApplyResult } from '@shu/api-client';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const mediaUrl = (path: string | null | undefined): string | null =>
  !path ? null : path.startsWith('http') ? path : `${BASE_URL}${path}`;

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

export default function StoreCart() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const items = useStoreCartStore((s) => s.items);
  const updateQty = useStoreCartStore((s) => s.updateQty);
  const removeItem = useStoreCartStore((s) => s.removeItem);
  const businessId = useStoreCartStore((s) => s.businessId);
  const areaId = useStoreCartStore((s) => s.areaId);
  const clearCart = useStoreCartStore((s) => s.clear);
  const subtotal = useStoreCartStore((s) => s.total());
  const setActiveOrder = useActiveOrderStore((s) => s.set);

  const [payment, setPayment] = useState<'CASH' | 'ELECTRONIC'>('CASH');
  const [addressPickerVisible, setAddressPickerVisible] = useState(false);
  const [addressError, setAddressError] = useState(false);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const appliedCoupon = useStoreCartStore((s) => s.appliedCoupon);
  const setAppliedCoupon = useStoreCartStore((s) => s.setAppliedCoupon);
  const [couponError, setCouponError] = useState('');

  const selectedAddressId = useSavedAddressesStore((s) => s.selectedId);
  const selectAddress = useSavedAddressesStore((s) => s.select);

  const token = useAuthStore((s) => s.token);

  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressesApi.list(),
    enabled: !!token,
  });

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) ?? addresses[0] ?? null;

  const { data: business, isLoading: loadingBusiness } = useQuery({
    queryKey: ['business', businessId],
    queryFn: () => businessesApi.getById(businessId!),
    enabled: !!businessId,
  });

  const fee = business?.deliveryType === 'SELF' ? 0 : Number(business?.area?.deliveryFee ?? 0);
  const minimumOrder = Number(business?.minimumOrder ?? 0);
  const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const subtotalAfterCoupon = Math.max(0, Number(subtotal) - discount);
  const total = subtotalAfterCoupon + fee;
  const belowMinimum = minimumOrder > 0 && Number(subtotal) < minimumOrder;

  const applyCoupon = useMutation({
    mutationFn: () => couponsApi.apply(couponInput.trim(), Number(subtotal)),
    onSuccess: (data) => {
      // NOTE: In the future, backend will handle BusinessType validation for coupons.
      // For now, if the user successfully applies it, we just set it.
      setAppliedCoupon(data);
      setCouponError('');
    },
    onError: (err: any) => {
      setCouponError(err?.response?.data?.message || 'كود الكوبون غير صحيح');
      setAppliedCoupon(null);
    },
  });

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
  };

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
      // Go to STORE tracking
      router.replace(`/(stores)/track/${data.id}`);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'فشل إرسال الطلب. يرجى المحاولة لاحقاً.';
      Alert.alert('خطأ في إرسال الطلب', msg);
    },
  });

  const handleConfirm = () => {
    if (!businessId) return;
    if (belowMinimum) {
      Alert.alert('الحد الأدنى للطلب', `الحد الأدنى للطلب من هذا المتجر هو ${minimumOrder} ₪. أضف المزيد من المنتجات للمتابعة.`);
      return;
    }
    const deliveryAreaId = selectedAddress?.areaId ?? areaId ?? '';
    if (!selectedAddress || !deliveryAreaId) {
      setAddressError(true);
      setAddressPickerVisible(true);
      return;
    }
    setAddressError(false);
    const areaLabel = selectedAddress?.area
      ? `${selectedAddress.area.city} — ${selectedAddress.area.name}`
      : undefined;
      
    createOrder.mutate({
      businessId,
      areaId: deliveryAreaId,
      paymentMethod: payment,
      items: items.map((it) => ({ productId: it.productId, quantity: it.quantity, variantId: it.variantId ?? undefined })),
      deliveryAreaName: areaLabel,
      deliveryAddressDetail: selectedAddress?.detail,
      couponCode: appliedCoupon?.code,
    } as CreateOrderDto);
  };

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowRight size={28} color={storeColors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>سلة المتجر</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.emptyWrap}>
          <View style={styles.emptyCircle}>
            <Store size={40} color={storeColors.primary} />
          </View>
          <Text style={styles.emptyTitle}>سلة المتجر فارغة</Text>
          <Text style={styles.emptyDesc}>تصفّح المتاجر وأضف منتجاتك للسلة الآن!</Text>
          <Button title="تصفّح المتاجر" onPress={() => router.replace('/(stores)')} style={styles.emptyBtn} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowRight size={28} color={storeColors.primary} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>سلة {business?.name || 'المتجر'}</Text>
          <Text style={styles.headerSubtitle}>{items.reduce((sum, i) => sum + i.quantity, 0)} منتج</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Minimum order warning banner */}
      {belowMinimum && (
        <View style={styles.minimumBanner}>
          <Text style={styles.minimumBannerText}>
            الحد الأدنى للطلب {minimumOrder} ₪ — أضف {(minimumOrder - Number(subtotal)).toFixed(2)} ₪ للمتابعة
          </Text>
        </View>
      )}

      {/* Address Picker Modal */}
      <Modal visible={addressPickerVisible} transparent animationType="slide" onRequestClose={() => setAddressPickerVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAddressPickerVisible(false)} />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing[4] }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>اختر عنوان التوصيل</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
            {addresses.length === 0 ? (
              <View style={styles.emptyAddresses}>
                <MapPin size={40} color={storeColors.border} />
                <Text style={styles.emptyAddressesText}>لا توجد عناوين محفوظة</Text>
                <Text style={styles.emptyAddressesHint}>أضف عنواناً لتسريع عملية الطلب</Text>
              </View>
            ) : (
              addresses.map((a) => {
                const isActive = (selectedAddress?.id ?? null) === a.id ||
                  (selectedAddressId === null && addresses[0]?.id === a.id);
                return (
                  <Pressable
                    key={a.id}
                    style={[styles.addrRow, isActive && styles.addrRowActive]}
                    onPress={() => { selectAddress(a.id); setAddressError(false); setAddressPickerVisible(false); }}
                  >
                    <View style={[styles.addrIconCircle, isActive && styles.addrIconCircleActive]}>
                      <HomeIcon size={18} color={isActive ? storeColors.primary : storeColors.textMuted} />
                    </View>
                    <View style={styles.addrRowText}>
                      <Text style={[styles.addrLabel, isActive && styles.addrLabelActive]}>{a.label}</Text>
                      <Text style={styles.addrDetail} numberOfLines={1}>{a.detail}</Text>
                    </View>
                    {isActive && <Check size={18} color={storeColors.primary} />}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
          <Pressable
            style={styles.addAddressBtn}
            onPress={() => { setAddressPickerVisible(false); router.push('/profile/addresses'); }}
          >
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.addAddressBtnText}>إضافة عنوان جديد</Text>
          </Pressable>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Address selector */}
        <Pressable
          style={[styles.addressSelector, addressError && styles.addressSelectorError]}
          onPress={() => setAddressPickerVisible(true)}
        >
          <ChevronDown size={16} color={storeColors.primary} />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={styles.addressSelectorLabel}>التوصيل إلى</Text>
            <Text style={styles.addressSelectorName} numberOfLines={1}>
              {selectedAddress ? selectedAddress.label : 'اختر عنوان التوصيل'}
            </Text>
          </View>
          <MapPin size={16} color={storeColors.primary} />
        </Pressable>
        {addressError && (
          <Text style={styles.addressErrorText}>الرجاء اختيار عنوان التوصيل لإتمام الطلب</Text>
        )}

        {/* Cart Items */}
        <View style={styles.itemsSection}>
          {items.map((it) => (
            <View key={`${it.productId}__${it.variantId ?? ''}`} style={styles.itemCard}>
              {/* Image right side */}
              <View style={styles.itemImageWrap}>
                {it.imageUrl ? (
                  <Image source={{ uri: mediaUrl(it.imageUrl)! }} style={styles.itemImage} contentFit="cover" />
                ) : (
                  <View style={styles.itemImagePlaceholder}>
                    <Store size={28} color={storeColors.border} />
                  </View>
                )}
              </View>
              
              <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                  <Pressable onPress={() => removeItem(it.productId, it.variantId)} style={styles.deleteBtn} hitSlop={8}>
                    <Trash2 size={16} color={storeColors.error} />
                  </Pressable>
                  <View style={styles.itemNameWrap}>
                    <Text style={styles.itemName} numberOfLines={2}>{it.name}</Text>
                    {it.variantName ? (
                      <View style={styles.variantPill}>
                        <Text style={styles.variantPillText}>{it.variantName}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                
                <View style={styles.itemFooter}>
                  <Text style={styles.itemPrice}>{it.price} ₪</Text>
                  <View style={styles.qtyWrap}>
                    <Pressable style={styles.qtyBtnPlus} onPress={() => updateQty(it.productId, 1, it.variantId)}>
                      <Plus size={16} color="#fff" />
                    </Pressable>
                    <Text style={styles.qtyText}>{it.quantity}</Text>
                    <Pressable style={styles.qtyBtnMinus} onPress={() => updateQty(it.productId, -1, it.variantId)}>
                      <Minus size={16} color={storeColors.textPrimary} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Store Coupon Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎟️ كود خصم المتجر</Text>
          {appliedCoupon ? (
            <View style={styles.appliedCoupon}>
              <Pressable onPress={removeCoupon} style={styles.removeCouponBtn}>
                <X size={16} color={storeColors.error} />
              </Pressable>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.appliedCouponCode}>{appliedCoupon.code}</Text>
                <Text style={styles.appliedCouponDiscount}>خصم -{appliedCoupon.discountAmount} ₪</Text>
              </View>
              <Tag size={20} color={storeColors.secondary} />
            </View>
          ) : (
            <View style={styles.couponRow}>
              <Pressable
                style={[styles.couponApplyBtn, applyCoupon.isPending && { opacity: 0.6 }]}
                onPress={() => couponInput.trim() && applyCoupon.mutate()}
                disabled={applyCoupon.isPending || !couponInput.trim()}
              >
                {applyCoupon.isPending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.couponApplyText}>تطبيق</Text>}
              </Pressable>
              <TextInput
                style={[styles.couponInput, couponError ? styles.couponInputError : null]}
                placeholder="أدخل الكود"
                placeholderTextColor={storeColors.textMuted}
                value={couponInput}
                onChangeText={(t) => { setCouponInput(t); setCouponError(''); }}
                autoCapitalize="characters"
                textAlign="right"
              />
            </View>
          )}
          {couponError ? <Text style={styles.couponErrorText}>{couponError}</Text> : null}
        </View>

        {/* Payment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>طريقة الدفع</Text>
          <View style={styles.paymentGrid}>
            <Pressable style={[styles.paymentCard, payment === 'CASH' && styles.paymentCardActive]} onPress={() => setPayment('CASH')}>
              <Banknote size={32} color={payment === 'CASH' ? storeColors.primary : storeColors.textMuted} style={styles.paymentIcon} />
              <Text style={[styles.paymentText, payment === 'CASH' && styles.paymentTextActive]}>نقد عند الاستلام</Text>
            </Pressable>
          </View>
          <Text style={styles.infoNote}>قد يحتاج توصيل المتجر وقتاً أطول حسب حجم الطلب والمنطقة</Text>
        </View>

        {/* Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>ملخص الدفع</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>{Number(subtotal).toFixed(2)} ₪</Text>
            <Text style={styles.summaryLabel}>المنتجات ({items.reduce((s, i) => s + i.quantity, 0)} صنف)</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>{fee === 0 ? 'مجاناً' : `${fee.toFixed(2)} ₪`}</Text>
            <Text style={styles.summaryLabel}>رسوم التوصيل</Text>
          </View>
          
          {appliedCoupon && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryValue, { color: storeColors.success }]}>-{discount.toFixed(2)} ₪</Text>
              <Text style={[styles.summaryLabel, { color: storeColors.success }]}>خصم الكوبون</Text>
            </View>
          )}

          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.totalValue}>{total.toFixed(2)} ₪</Text>
            <Text style={styles.totalLabel}>الإجمالي</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer Checkout */}
      <View style={[styles.footer, { paddingBottom: insets.bottom || spacing[4] }]}>
        <View style={styles.footerRow}>
          <Text style={styles.footerTotal}>{total.toFixed(2)} ₪</Text>
          <Text style={styles.footerLabel}>الإجمالي</Text>
        </View>
        <Button
          title={`تأكيد الطلب (${items.reduce((s, i) => s + i.quantity, 0)} صنف)`}
          onPress={handleConfirm}
          loading={createOrder.isPending}
          disabled={belowMinimum}
          style={[styles.checkoutBtn, belowMinimum && { opacity: 0.5 }] as any}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: { flex: 1, backgroundColor: storeColors.background },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  emptyCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(151,72,0,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: spacing[6] },
  emptyTitle: { fontFamily: fontFamily.bold, fontSize: 24, color: storeColors.textPrimary, marginBottom: spacing[2] },
  emptyDesc: { fontFamily: fontFamily.medium, fontSize: 16, color: storeColors.textMuted, textAlign: 'center', marginBottom: spacing[8], lineHeight: 24 },
  emptyBtn: { width: '100%', backgroundColor: storeColors.primary },
  
  container: { flex: 1, backgroundColor: '#fbf8ff' },
  header: {
    backgroundColor: storeColors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: storeColors.border,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  headerTitle: { fontFamily: fontFamily.bold, fontSize: 18, color: storeColors.textPrimary },
  headerSubtitle: { fontFamily: fontFamily.medium, fontSize: 12, color: storeColors.textMuted, marginTop: 2 },
  
  minimumBanner: {
    backgroundColor: 'rgba(230,120,30,0.15)',
    padding: spacing[3],
    alignItems: 'center',
  },
  minimumBannerText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: storeColors.primaryContainer,
  },
  
  scrollContent: { paddingHorizontal: spacing[4], paddingTop: spacing[4] },
  
  addressSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: storeColors.surface,
    padding: spacing[4],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: storeColors.border,
    marginBottom: spacing[2],
  },
  addressSelectorError: { borderColor: storeColors.error, backgroundColor: 'rgba(186,26,26,0.05)' },
  addressSelectorLabel: { fontFamily: fontFamily.medium, fontSize: 13, color: storeColors.textMuted },
  addressSelectorName: { fontFamily: fontFamily.bold, fontSize: 15, color: storeColors.textPrimary, marginTop: 2 },
  addressErrorText: { fontFamily: fontFamily.medium, fontSize: 12, color: storeColors.error, textAlign: 'right', marginBottom: spacing[4], paddingRight: spacing[2] },
  
  itemsSection: { marginTop: spacing[4], gap: spacing[3] },
  itemCard: {
    flexDirection: 'row-reverse',
    backgroundColor: '#FFFFFF',
    padding: spacing[3],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 3 },
      web: { boxShadow: '0 4px 10px rgba(0,0,0,0.06)' },
    }),
  },
  itemImageWrap: {
    width: 80,
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F5F2FC',
    marginLeft: spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(229,224,213,0.5)'
  },
  itemImage: { width: '100%', height: '100%' },
  itemImagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  itemContent: { flex: 1, justifyContent: 'space-between', paddingVertical: 2 },
  itemHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' },
  deleteBtn: { padding: spacing[1], backgroundColor: 'rgba(186, 26, 26, 0.05)', borderRadius: 8 },
  itemNameWrap: { flex: 1, alignItems: 'flex-end', marginRight: spacing[2] },
  itemName: { fontFamily: fontFamily.bold, fontSize: 16, color: storeColors.textPrimary, textAlign: 'right' },
  variantPill: {
    backgroundColor: 'rgba(151, 72, 0, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  variantPillText: { fontFamily: fontFamily.medium, fontSize: 11, color: storeColors.primary },
  itemFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing[3] },
  itemPrice: { fontFamily: fontFamily.bold, fontSize: 16, color: storeColors.primary, textAlign: 'right' },
  qtyWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fbf8ff', borderRadius: 12, padding: 4 },
  qtyBtnPlus: { width: 32, height: 32, borderRadius: 10, backgroundColor: storeColors.primary, alignItems: 'center', justifyContent: 'center' },
  qtyBtnMinus: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(229,224,213,1)' },
  qtyText: { fontFamily: fontFamily.bold, fontSize: 15, color: storeColors.textPrimary, width: 32, textAlign: 'center' },
  
  section: { marginTop: spacing[6] },
  sectionTitle: { fontFamily: fontFamily.bold, fontSize: 18, color: storeColors.textPrimary, textAlign: 'right', marginBottom: spacing[3] },
  
  couponRow: { flexDirection: 'row', alignItems: 'center' },
  couponInput: { flex: 1, height: 52, backgroundColor: storeColors.surface, borderWidth: 1, borderColor: storeColors.border, borderRadius: 16, paddingHorizontal: spacing[4], fontFamily: fontFamily.medium, fontSize: 15, color: storeColors.textPrimary, marginLeft: spacing[3] },
  couponInputError: { borderColor: storeColors.error },
  couponApplyBtn: { width: 80, height: 52, backgroundColor: storeColors.primaryContainer, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  couponApplyText: { fontFamily: fontFamily.bold, fontSize: 15, color: storeColors.white },
  couponErrorText: { fontFamily: fontFamily.medium, fontSize: 12, color: storeColors.error, textAlign: 'right', marginTop: spacing[2], paddingRight: spacing[2] },
  appliedCoupon: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(41,106,67,0.05)', padding: spacing[4], borderRadius: 16, borderWidth: 1, borderColor: 'rgba(41,106,67,0.2)' },
  removeCouponBtn: { padding: spacing[1] },
  appliedCouponCode: { fontFamily: fontFamily.bold, fontSize: 16, color: storeColors.textPrimary, marginRight: spacing[3] },
  appliedCouponDiscount: { fontFamily: fontFamily.medium, fontSize: 13, color: storeColors.success, marginRight: spacing[3], marginTop: 2 },
  
  infoNote: { fontFamily: fontFamily.medium, fontSize: 13, color: storeColors.textMuted, textAlign: 'right', marginTop: spacing[3] },
  
  paymentGrid: { flexDirection: 'row', justifyContent: 'flex-end' },
  paymentCard: { width: '48%', backgroundColor: storeColors.surface, borderWidth: 1, borderColor: storeColors.border, borderRadius: 16, padding: spacing[4], alignItems: 'center' },
  paymentCardActive: { borderColor: storeColors.primary, backgroundColor: 'rgba(151,72,0,0.05)' },
  paymentIcon: { marginBottom: spacing[2] },
  paymentText: { fontFamily: fontFamily.bold, fontSize: 14, color: storeColors.textMuted },
  paymentTextActive: { color: storeColors.primary },
  
  summarySection: { marginTop: spacing[6], backgroundColor: storeColors.surface, padding: spacing[4], borderRadius: 20, borderWidth: 1, borderColor: storeColors.border },
  summaryTitle: { fontFamily: fontFamily.bold, fontSize: 18, color: storeColors.textPrimary, textAlign: 'right', marginBottom: spacing[4] },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] },
  summaryValue: { fontFamily: fontFamily.bold, fontSize: 15, color: storeColors.textPrimary },
  summaryLabel: { fontFamily: fontFamily.medium, fontSize: 15, color: storeColors.textMuted },
  divider: { height: 1, backgroundColor: storeColors.border, marginVertical: spacing[3] },
  totalValue: { fontFamily: fontFamily.bold, fontSize: 20, color: storeColors.primary },
  totalLabel: { fontFamily: fontFamily.bold, fontSize: 18, color: storeColors.textPrimary },
  
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: storeColors.surface, paddingHorizontal: spacing[4], paddingTop: spacing[4], borderTopWidth: 1, borderTopColor: storeColors.border, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 8 } }) },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] },
  footerTotal: { fontFamily: fontFamily.bold, fontSize: 24, color: storeColors.primary },
  footerLabel: { fontFamily: fontFamily.bold, fontSize: 18, color: storeColors.textPrimary },
  checkoutBtn: { width: '100%', backgroundColor: storeColors.primary, borderRadius: 16 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: storeColors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing[4], maxHeight: '80%', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 }, android: { elevation: 24 } }) },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: storeColors.border, alignSelf: 'center', marginBottom: spacing[4] },
  modalTitle: { fontFamily: fontFamily.bold, fontSize: 18, color: storeColors.textPrimary, textAlign: 'center', marginBottom: spacing[4] },
  modalScroll: { marginBottom: spacing[4] },
  emptyAddresses: { alignItems: 'center', paddingVertical: spacing[8] },
  emptyAddressesText: { fontFamily: fontFamily.bold, fontSize: 16, color: storeColors.textPrimary, marginTop: spacing[4], marginBottom: spacing[2] },
  emptyAddressesHint: { fontFamily: fontFamily.medium, fontSize: 14, color: storeColors.textMuted },
  addrRow: { flexDirection: 'row', alignItems: 'center', padding: spacing[4], borderRadius: 16, borderWidth: 1, borderColor: storeColors.border, marginBottom: spacing[3] },
  addrRowActive: { borderColor: storeColors.primary, backgroundColor: 'rgba(151,72,0,0.05)' },
  addrIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: storeColors.background, alignItems: 'center', justifyContent: 'center', marginLeft: spacing[3] },
  addrIconCircleActive: { backgroundColor: 'rgba(151,72,0,0.1)' },
  addrRowText: { flex: 1, alignItems: 'flex-end' },
  addrLabel: { fontFamily: fontFamily.bold, fontSize: 15, color: storeColors.textPrimary, marginBottom: 2 },
  addrLabelActive: { color: storeColors.primary },
  addrDetail: { fontFamily: fontFamily.medium, fontSize: 13, color: storeColors.textMuted },
  addAddressBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: storeColors.primary, padding: spacing[4], borderRadius: 16, gap: spacing[2] },
  addAddressBtnText: { fontFamily: fontFamily.bold, fontSize: 16, color: '#fff' },
});
