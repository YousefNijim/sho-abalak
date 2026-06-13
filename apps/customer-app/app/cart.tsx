import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View, TextInput, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Minus, Plus, Trash2, ArrowRight, Banknote, CreditCard, ShoppingBag, MapPin, ChevronDown, Home as HomeIcon, Check, Tag, X } from 'lucide-react-native';
import { Button } from '@shu/ui-components/native';
import { colors, fontSizes, fontFamily, radius, spacing } from '../src/theme';
import { useCartStore } from '../src/stores/cart.store';
import { useActiveOrderStore } from '../src/stores/active-order.store';
import { useAuthStore } from '../src/stores/auth.store';
import { businessesApi, ordersApi, addressesApi, couponsApi, BASE_URL } from '@shu/api-client';
import { useSavedAddressesStore } from '../src/stores/saved-addresses.store';
import type { CreateOrderDto, CouponApplyResult } from '@shu/api-client';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const mediaUrl = (path: string | null | undefined): string | null =>
  !path ? null : path.startsWith('http') ? path : `${BASE_URL}${path}`;

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

  const [payment, setPayment] = useState<'CASH' | 'ELECTRONIC'>('CASH');
  const [notes, setNotes] = useState('');
  const [addressPickerVisible, setAddressPickerVisible] = useState(false);
  const [addressError, setAddressError] = useState(false);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponApplyResult | null>(null);
  const [couponError, setCouponError] = useState('');

  const selectedAddressId = useSavedAddressesStore((s) => s.selectedId);
  const selectAddress = useSavedAddressesStore((s) => s.select);

  const token = useAuthStore((s) => s.token);

  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressesApi.list(),
    enabled: !!token,
  });

  const { data: availableCoupons = [] } = useQuery({
    queryKey: ['coupons-active'],
    queryFn: () => couponsApi.active(),
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
      router.replace({ pathname: '/tracking', params: { id: data.id } });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'فشل إرسال الطلب. يرجى المحاولة لاحقاً.';
      Alert.alert('خطأ في إرسال الطلب', msg);
    },
  });

  const handleConfirm = () => {
    if (!businessId) return;
    if (belowMinimum) {
      Alert.alert('الحد الأدنى للطلب', `الحد الأدنى للطلب من هذه المنشأة هو ${minimumOrder} ₪. أضف المزيد من المنتجات للمتابعة.`);
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
      note: notes.trim() || undefined,
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
            <ArrowRight size={28} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>سلّتك</Text>
          <View style={{ width: 44 }} />
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
      {/* Single header: title on right, back arrow on left */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowRight size={28} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>سلّتك</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Coupon slider */}
      {availableCoupons.length > 0 && (
        <View style={styles.couponSliderWrap}>
          <Text style={styles.couponSliderTitle}>🎟️ كوبونات متاحة</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.couponSliderScroll}>
            {(availableCoupons as any[]).map((c) => {
              const isApplied = appliedCoupon?.code === c.code;
              const discountLabel = c.discountType === 'PERCENTAGE'
                ? `${c.discountPct}%${c.maxDiscount ? ` (حتى ${c.maxDiscount} ₪)` : ''}`
                : `${c.discountAmount} ₪`;
              return (
                <View key={c.id} style={[styles.couponCard, isApplied && styles.couponCardApplied]}>
                  <View style={styles.couponInfo}>
                    <Text style={[styles.couponDiscount, isApplied && { color: 'rgba(255,255,255,0.85)' }]}>خصم {discountLabel}</Text>
                    <Text style={[styles.couponMin, isApplied && { color: 'rgba(255,255,255,0.7)' }]}>حد أدنى {c.minimumOrder} ₪</Text>
                    {isApplied ? (
                      <Pressable style={styles.couponRemoveBtn} onPress={removeCoupon}>
                        <Text style={styles.couponRemoveBtnText}>إزالة</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        style={styles.couponApplyCardBtn}
                        onPress={() => {
                          setCouponInput(c.code);
                          couponsApi.apply(c.code, Number(subtotal))
                            .then((result) => { setAppliedCoupon(result); setCouponError(''); })
                            .catch((err: any) => setCouponError(err?.response?.data?.message || 'لا يمكن تطبيق هذا الكوبون'));
                        }}
                      >
                        <Text style={styles.couponApplyCardBtnText}>تطبيق</Text>
                      </Pressable>
                    )}
                  </View>
                  <View style={[styles.couponCodeWrap, isApplied && styles.couponCodeWrapApplied]}>
                    <Tag size={16} color={isApplied ? colors.white : colors.primary} />
                    <Text style={[styles.couponCode, isApplied && { color: '#fff' }]}>{c.code}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          {couponError ? <Text style={styles.couponErrorText}>{couponError}</Text> : null}
        </View>
      )}

      {/* Minimum order warning banner */}
      {belowMinimum && (
        <View style={styles.minimumBanner}>
          <Text style={styles.minimumBannerText}>
            الحد الأدنى للطلب {minimumOrder} ₪ — أضف {(minimumOrder - Number(subtotal)).toFixed(2)} ₪ أكثر
          </Text>
        </View>
      )}


      <Modal visible={addressPickerVisible} transparent animationType="slide" onRequestClose={() => setAddressPickerVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAddressPickerVisible(false)} />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing[4] }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>اختر عنوان التوصيل</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
            {addresses.length === 0 ? (
              <View style={styles.emptyAddresses}>
                <MapPin size={40} color={colors.border} />
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
                      <HomeIcon size={18} color={isActive ? colors.primary : colors.textMuted} />
                    </View>
                    <View style={styles.addrRowText}>
                      <Text style={[styles.addrLabel, isActive && styles.addrLabelActive]}>{a.label}</Text>
                      <Text style={styles.addrDetail} numberOfLines={1}>{a.detail}</Text>
                    </View>
                    {isActive && <Check size={18} color={colors.primary} />}
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
        {/* Address selector — compact, inside scroll */}
        <Pressable
          style={[styles.addressSelector, addressError && styles.addressSelectorError]}
          onPress={() => setAddressPickerVisible(true)}
        >
          <ChevronDown size={16} color={colors.primary} />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={styles.addressSelectorLabel}>التوصيل إلى</Text>
            <Text style={styles.addressSelectorName} numberOfLines={1}>
              {selectedAddress ? selectedAddress.label : 'اختر عنوان التوصيل'}
            </Text>
          </View>
          <MapPin size={16} color={colors.primary} />
        </Pressable>
        {addressError && (
          <Text style={styles.addressErrorText}>الرجاء اختيار عنوان التوصيل لإتمام الطلب</Text>
        )}

        {/* Cart Items */}
        <View style={styles.itemsSection}>
          {items.map((it) => (
            <View key={`${it.productId}__${it.variantId ?? ''}`} style={styles.itemCard}>
              {/* Image */}
              <View style={styles.itemImageWrap}>
                {(it as any).imageUrl ? (
                  <Image source={{ uri: mediaUrl((it as any).imageUrl)! }} style={styles.itemImage} contentFit="cover" />
                ) : (
                  <View style={styles.itemImagePlaceholder}>
                    <Text style={{ fontSize: 28 }}>🍽️</Text>
                  </View>
                )}
              </View>
              {/* Content */}
              <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                  <Pressable onPress={() => removeItem(it.productId, it.variantId)} style={styles.deleteBtn}>
                    <Trash2 size={18} color={colors.error} />
                  </Pressable>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                    {it.variantName ? (
                      <Text style={styles.itemVariantName}>{it.variantName}</Text>
                    ) : null}
                  </View>
                </View>
                <Text style={styles.itemPrice}>{it.price} ₪</Text>
                <View style={styles.itemFooter}>
                  <View style={styles.qtyWrap}>
                    <Pressable style={styles.qtyBtnPlus} onPress={() => updateQty(it.productId, 1, it.variantId)}>
                      <Plus size={18} color={colors.white} />
                    </Pressable>
                    <Text style={styles.qtyText}>{it.quantity}</Text>
                    <Pressable style={styles.qtyBtnMinus} onPress={() => updateQty(it.productId, -1, it.variantId)}>
                      <Minus size={18} color={colors.textPrimary} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Coupon Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>كوبون الخصم</Text>
          {appliedCoupon ? (
            <View style={styles.appliedCoupon}>
              <Pressable onPress={removeCoupon} style={styles.removeCouponBtn}>
                <X size={16} color={colors.error} />
              </Pressable>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.appliedCouponCode}>{appliedCoupon.code}</Text>
                <Text style={styles.appliedCouponDiscount}>خصم -{appliedCoupon.discountAmount} ₪</Text>
              </View>
              <Tag size={20} color={colors.secondary} />
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
                placeholder="أدخل كود الكوبون"
                placeholderTextColor={colors.textMuted}
                value={couponInput}
                onChangeText={(t) => { setCouponInput(t); setCouponError(''); }}
                autoCapitalize="characters"
                textAlign="right"
              />
            </View>
          )}
          {couponError ? <Text style={styles.couponErrorText}>{couponError}</Text> : null}
        </View>

        {/* Notes */}
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

        {/* Payment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>طريقة الدفع</Text>
          <View style={styles.paymentGrid}>
            <Pressable style={[styles.paymentCard, payment === 'CASH' && styles.paymentCardActive]} onPress={() => setPayment('CASH')}>
              <Banknote size={32} color={payment === 'CASH' ? colors.primary : colors.textMuted} style={styles.paymentIcon} />
              <Text style={[styles.paymentText, payment === 'CASH' && styles.paymentTextActive]}>نقد عند الاستلام</Text>
            </Pressable>
            <Pressable style={[styles.paymentCard, payment === 'ELECTRONIC' && styles.paymentCardActive]} onPress={() => setPayment('ELECTRONIC')}>
              <CreditCard size={32} color={payment === 'ELECTRONIC' ? colors.primary : colors.textMuted} style={styles.paymentIcon} />
              <Text style={[styles.paymentText, payment === 'ELECTRONIC' && styles.paymentTextActive]}>دفع إلكتروني</Text>
            </Pressable>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>المجموع الفرعي</Text>
            <Text style={styles.summaryValueBold}>{Number(subtotal).toFixed(2)} ₪</Text>
          </View>
          {appliedCoupon && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.secondary }]}>خصم الكوبون ({appliedCoupon.code})</Text>
              <Text style={[styles.summaryValueBold, { color: colors.secondary }]}>-{discount.toFixed(2)} ₪</Text>
            </View>
          )}
          {appliedCoupon && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>المجموع بعد الخصم</Text>
              <Text style={styles.summaryValueBold}>{subtotalAfterCoupon.toFixed(2)} ₪</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>رسوم التوصيل</Text>
            <Text style={styles.summaryValueBold}>{loadingBusiness ? '...' : `${fee} ₪`}</Text>
          </View>
          <View style={styles.dashedDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>الإجمالي</Text>
            <Text style={styles.summaryTotalValue}>{loadingBusiness ? '...' : `${total.toFixed(2)} ₪`}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom || spacing[4] }]}>
        {belowMinimum && (
          <Text style={styles.minimumFooterText}>
            أضف {(minimumOrder - Number(subtotal)).toFixed(2)} ₪ للوصول للحد الأدنى ({minimumOrder} ₪)
          </Text>
        )}
        <View style={styles.footerContent}>
          <Button
            onPress={handleConfirm}
            loading={createOrder.isPending}
            disabled={createOrder.isPending || loadingBusiness || belowMinimum}
            style={{ ...styles.confirmBtn, ...(belowMinimum ? { opacity: 0.5 } : {}) }}
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
  container: { flex: 1, backgroundColor: '#FCF3DC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing[4], paddingBottom: spacing[3], backgroundColor: '#FCF3DC', zIndex: 50, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  headerTitle: { fontFamily: fontFamily.bold, fontSize: 20, color: colors.primary, flex: 1, textAlign: 'right' },
  backBtn: { padding: spacing[2] },
  minimumBanner: { backgroundColor: '#FEF3C7', paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: '#FDE68A' },
  minimumBannerText: { fontFamily: fontFamily.semibold, fontSize: fontSizes.sm, color: '#92400E', textAlign: 'right' },
  scrollContent: { paddingHorizontal: spacing[4], paddingTop: spacing[6], gap: spacing[6] },
  itemsSection: { gap: spacing[3] },
  itemCard: { backgroundColor: '#FFFFFF', borderRadius: radius.lg, padding: spacing[3], flexDirection: 'row', alignItems: 'center', gap: spacing[3], ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 }, android: { elevation: 2 }, web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' } }) },
  itemImageWrap: { width: 76, height: 76, borderRadius: radius.md, overflow: 'hidden', backgroundColor: 'rgba(229,224,213,1)', flexShrink: 0 },
  itemImage: { width: '100%', height: '100%' },
  itemImagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  itemContent: { flex: 1, minWidth: 0 },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-end' },
  itemName: { fontFamily: fontFamily.semibold, fontSize: 15, color: colors.textPrimary, textAlign: 'right' },
  itemVariantName: { fontFamily: fontFamily.regular, fontSize: 12, color: colors.textMuted, textAlign: 'right', marginTop: 2 },
  deleteBtn: { padding: 2, marginLeft: spacing[1] },
  itemPrice: { fontFamily: fontFamily.bold, color: colors.primary, marginTop: 4, textAlign: 'right' },
  itemFooter: { marginTop: spacing[2], flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qtyWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#efecf6', borderRadius: radius.full, paddingHorizontal: spacing[2], paddingVertical: spacing[1], gap: spacing[3] },
  qtyBtnPlus: { width: 32, height: 32, backgroundColor: colors.primary, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontFamily: fontFamily.bold, fontSize: 15, color: colors.textPrimary },
  qtyBtnMinus: { width: 32, height: 32, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: 'rgba(138,114,101,1)', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  section: { gap: spacing[2] },
  sectionTitle: { fontFamily: fontFamily.semibold, fontSize: 16, color: colors.textPrimary, paddingHorizontal: 4, textAlign: 'right' },
  // Coupon slider
  couponSliderWrap: { paddingTop: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  couponSliderTitle: { fontFamily: fontFamily.bold, fontSize: fontSizes.sm, color: colors.textPrimary, textAlign: 'right', paddingHorizontal: spacing[4], marginBottom: spacing[2] },
  couponSliderScroll: { paddingHorizontal: spacing[4], gap: spacing[3], paddingBottom: spacing[3] },
  couponCard: { width: 230, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing[3], borderWidth: 1.5, borderColor: colors.primary + '40', borderStyle: 'dashed', gap: spacing[2] },
  couponCardApplied: { backgroundColor: colors.primary, borderColor: colors.primary, borderStyle: 'solid' },
  couponInfo: { alignItems: 'flex-end', flex: 1 },
  couponCodeWrap: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '10', paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.lg },
  couponCodeWrapApplied: { backgroundColor: 'rgba(255,255,255,0.15)' },
  couponCode: { fontFamily: fontFamily.extrabold, fontSize: fontSizes.sm, color: colors.primary, letterSpacing: 1, marginTop: 2 },
  couponDiscount: { fontFamily: fontFamily.bold, fontSize: fontSizes.sm, color: colors.secondary },
  couponMin: { fontFamily: fontFamily.regular, fontSize: 10, color: colors.textMuted },
  couponApplyCardBtn: { backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: 4, marginTop: spacing[1], alignSelf: 'flex-end' },
  couponApplyCardBtnText: { fontFamily: fontFamily.bold, fontSize: fontSizes.xs, color: '#fff' },
  couponRemoveBtn: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: 4, marginTop: spacing[1], alignSelf: 'flex-end' },
  couponRemoveBtnText: { fontFamily: fontFamily.bold, fontSize: fontSizes.xs, color: '#fff' },
  // Coupon input row
  couponRow: { flexDirection: 'row', gap: spacing[2], alignItems: 'center' },
  couponInput: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2], fontFamily: fontFamily.medium, fontSize: fontSizes.base, color: colors.textPrimary, textAlign: 'right' },
  couponInputError: { borderColor: colors.error },
  couponApplyBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing[4], paddingVertical: spacing[3], alignItems: 'center', justifyContent: 'center', minWidth: 80 },
  couponApplyText: { fontFamily: fontFamily.bold, fontSize: fontSizes.sm, color: '#fff' },
  couponErrorText: { fontFamily: fontFamily.medium, fontSize: fontSizes.sm, color: colors.error, textAlign: 'right', paddingHorizontal: 4 },
  appliedCoupon: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.secondary + '12', borderRadius: radius.md, padding: spacing[3], gap: spacing[3], borderWidth: 1, borderColor: colors.secondary + '30' },
  appliedCouponCode: { fontFamily: fontFamily.bold, fontSize: fontSizes.base, color: colors.secondary, textAlign: 'right' },
  appliedCouponDiscount: { fontFamily: fontFamily.semibold, fontSize: fontSizes.sm, color: colors.secondary, textAlign: 'right' },
  removeCouponBtn: { padding: 4 },
  // Notes
  notesInput: { height: 96, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: 'rgba(229,224,213,1)', borderRadius: radius.lg, padding: spacing[4], fontFamily: fontFamily.regular, fontSize: 15, textAlignVertical: 'top' },
  // Payment
  paymentGrid: { flexDirection: 'row', gap: spacing[3] },
  paymentCard: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: 'transparent', borderRadius: radius.lg, padding: spacing[4], alignItems: 'center', justifyContent: 'center', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 }, android: { elevation: 2 }, web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' } }) },
  paymentCardActive: { borderColor: colors.primary, backgroundColor: '#ffdbc7' },
  paymentIcon: { marginBottom: 4 },
  paymentText: { fontFamily: fontFamily.medium, fontSize: 13, color: colors.textMuted },
  paymentTextActive: { color: colors.primary },
  // Summary
  summaryCard: { backgroundColor: '#FFFFFF', borderRadius: radius.lg, padding: spacing[4], gap: spacing[3], ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 }, android: { elevation: 2 }, web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' } }) },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontFamily: fontFamily.regular, fontSize: 15, color: colors.textMuted },
  summaryValueBold: { fontFamily: fontFamily.bold, fontSize: 15, color: colors.textPrimary },
  dashedDivider: { height: 1, borderBottomWidth: 1, borderBottomColor: 'rgba(229,224,213,1)', borderStyle: 'dashed', marginVertical: spacing[2] },
  summaryTotalLabel: { fontFamily: fontFamily.semibold, fontSize: 20, color: colors.textPrimary },
  summaryTotalValue: { fontFamily: fontFamily.semibold, fontSize: 20, color: colors.primary },
  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: spacing[4], paddingTop: spacing[3], ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 10 }, android: { elevation: 10 }, web: { boxShadow: '0 -4px 10px rgba(0,0,0,0.05)' } }), zIndex: 50 },
  minimumFooterText: { fontFamily: fontFamily.semibold, fontSize: fontSizes.xs, color: '#92400E', textAlign: 'center', marginBottom: spacing[2] },
  footerContent: { maxWidth: 600, width: '100%', alignSelf: 'center' },
  confirmBtn: { width: '100%', height: 52, backgroundColor: colors.primary, borderRadius: radius.md },
  confirmBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2] },
  confirmBtnText: { fontFamily: fontFamily.bold, fontSize: 16, color: colors.white },
  // Empty state
  emptyContainer: { flex: 1, backgroundColor: '#FCF3DC' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6] },
  emptyCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(151,72,0,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing[5] },
  emptyTitle: { fontFamily: fontFamily.bold, fontSize: 24, color: colors.textPrimary, marginBottom: spacing[2] },
  emptyDesc: { fontFamily: fontFamily.regular, fontSize: 15, color: colors.textMuted, textAlign: 'center', marginBottom: spacing[6] },
  emptyBtn: { paddingHorizontal: spacing[8] },
  // Address selector (inside scroll)
  addressSelector: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderWidth: 1, borderColor: colors.border },
  addressSelectorError: { borderColor: colors.error },
  addressSelectorLabel: { fontFamily: fontFamily.regular, fontSize: fontSizes.xs, color: colors.textMuted, textAlign: 'right' },
  addressSelectorName: { fontFamily: fontFamily.bold, fontSize: fontSizes.sm, color: colors.textPrimary, textAlign: 'right' },
  addressErrorText: { fontFamily: fontFamily.medium, fontSize: fontSizes.sm, color: colors.error, textAlign: 'right', paddingTop: spacing[1] },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing[4], maxHeight: '70%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.primary + '40', alignSelf: 'center', marginBottom: spacing[4] },
  modalTitle: { fontFamily: fontFamily.bold, fontSize: fontSizes.xl, color: colors.textPrimary, textAlign: 'right', marginBottom: spacing[4] },
  modalScroll: { flexGrow: 0 },
  addrRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[3], paddingHorizontal: spacing[3], borderRadius: radius.md, marginBottom: spacing[2], borderWidth: 1.5, borderColor: 'transparent' },
  addrRowActive: { backgroundColor: colors.primary + '0D', borderColor: colors.primary + '40' },
  addrIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.border + '80', alignItems: 'center', justifyContent: 'center' },
  addrIconCircleActive: { backgroundColor: colors.primary + '20' },
  addrRowText: { flex: 1, alignItems: 'flex-end' },
  addrLabel: { fontFamily: fontFamily.bold, fontSize: fontSizes.base, color: colors.textPrimary, textAlign: 'right' },
  addrLabelActive: { color: colors.primary },
  addrDetail: { fontFamily: fontFamily.regular, fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'right', marginTop: 2 },
  emptyAddresses: { alignItems: 'center', paddingVertical: spacing[8], gap: spacing[3] },
  emptyAddressesText: { fontFamily: fontFamily.semibold, fontSize: fontSizes.base, color: colors.textPrimary, textAlign: 'center' },
  emptyAddressesHint: { fontFamily: fontFamily.regular, fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'center' },
  addAddressBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing[3], marginTop: spacing[3] },
  addAddressBtnText: { fontFamily: fontFamily.bold, fontSize: fontSizes.base, color: '#FFFFFF' },
});
