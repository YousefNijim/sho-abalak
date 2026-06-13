import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { X, Plus, Minus, ShoppingCart } from 'lucide-react-native';
import { colors, fontFamily, fontSizes, radius, spacing } from '../src/theme';
import { BASE_URL } from '@shu/api-client';

const mediaUrl = (path: string | null | undefined): string | null =>
  !path ? null : path.startsWith('http') ? path : `${BASE_URL}${path}`;

export interface CartAddPayload {
  productId: string;
  name: string;
  price: number;
  variantId?: string | null;
  variantName?: string | null;
  quantity: number;
  imageUrl?: string | null;
}

interface Variant {
  id: string;
  name: string;
  price: number;
  stock: number | null;
  isAvailable: boolean;
}

interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  stock?: number | null;
  hasVariants?: boolean;
  variants?: Variant[];
  unit?: string | null;
}

interface Props {
  visible: boolean;
  product: Product;
  onClose: () => void;
  onAddToCart: (payload: CartAddPayload) => void;
}

export function VariantPicker({ visible, product, onClose, onAddToCart }: Props) {
  const variants = (product.variants ?? []).filter((v) => v.isAvailable);
  const hasVariants = product.hasVariants && variants.length > 0;

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    hasVariants ? (variants[0]?.id ?? null) : null,
  );
  const [qty, setQty] = useState(1);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? null;

  const unitPrice = selectedVariant ? Number(selectedVariant.price) : Number(product.price);

  // Max qty: enforce stock limit when tracked (stock !== null)
  const maxQty = (() => {
    if (selectedVariant) return selectedVariant.stock !== null ? selectedVariant.stock : 999;
    return product.stock !== null && product.stock !== undefined ? product.stock : 999;
  })();

  const handleQtyChange = (delta: number) => {
    setQty((prev) => Math.min(maxQty, Math.max(1, prev + delta)));
  };

  const handleVariantSelect = (id: string) => {
    setSelectedVariantId(id);
    setQty(1); // reset qty when variant changes
  };

  const handleAdd = () => {
    onAddToCart({
      productId: product.id,
      name: product.name,
      price: unitPrice,
      variantId: selectedVariant?.id ?? null,
      variantName: selectedVariant?.name ?? null,
      quantity: qty,
      imageUrl: product.imageUrl,
    });
    onClose();
    setQty(1);
  };

  const totalPrice = (unitPrice * qty).toFixed(2);
  const outOfStock = maxQty === 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose} />

      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Close button */}
        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
          <X size={20} color={colors.textMuted} />
        </Pressable>

        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* Product image */}
          {product.imageUrl && (
            <View style={styles.imageWrap}>
              <Image
                source={{ uri: mediaUrl(product.imageUrl)! }}
                style={styles.image}
                contentFit="cover"
              />
            </View>
          )}

          {/* Product name + desc */}
          <View style={styles.infoBlock}>
            <Text style={styles.productName}>{product.name}</Text>
            {product.description ? (
              <Text style={styles.productDesc} numberOfLines={3}>
                {product.description}
              </Text>
            ) : null}
          </View>

          {/* Variant selection */}
          {hasVariants && (
            <View style={styles.variantsBlock}>
              <Text style={styles.variantsLabel}>اختر الحجم / النوع:</Text>
              <View style={styles.variantsList}>
                {variants.map((v) => {
                  const isSelected = v.id === selectedVariantId;
                  const soldOut = v.stock !== null && v.stock === 0;
                  return (
                    <Pressable
                      key={v.id}
                      style={[
                        styles.variantCard,
                        isSelected && styles.variantCardSelected,
                        soldOut && styles.variantCardSoldOut,
                      ]}
                      onPress={() => !soldOut && handleVariantSelect(v.id)}
                      disabled={soldOut}
                    >
                      <Text
                        style={[
                          styles.variantPrice,
                          isSelected && styles.variantTextSelected,
                          soldOut && styles.variantTextMuted,
                        ]}
                      >
                        {Number(v.price).toFixed(2)} ₪
                      </Text>
                      <Text
                        style={[
                          styles.variantName,
                          isSelected && styles.variantTextSelected,
                          soldOut && styles.variantTextMuted,
                        ]}
                        numberOfLines={1}
                      >
                        {soldOut ? `${v.name} (نفد)` : v.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Low-stock badge */}
          {maxQty > 0 && maxQty <= 5 && (
            <View style={styles.lowStockBadge}>
              <Text style={styles.lowStockText}>⚠️ آخر {maxQty} قطع</Text>
            </View>
          )}

          {/* Quantity selector */}
          <View style={styles.qtyBlock}>
            <Text style={styles.qtyLabel}>الكمية</Text>
            <View style={styles.qtyRow}>
              <Pressable
                style={[styles.qtyBtn, qty >= maxQty && styles.qtyBtnDisabled]}
                onPress={() => handleQtyChange(1)}
                disabled={qty >= maxQty || outOfStock}
              >
                <Plus size={20} color={qty >= maxQty ? colors.textMuted : colors.primary} strokeWidth={2.5} />
              </Pressable>
              <Text style={styles.qtyValue}>{qty}</Text>
              <Pressable
                style={[styles.qtyBtn, qty <= 1 && styles.qtyBtnDisabled]}
                onPress={() => handleQtyChange(-1)}
                disabled={qty <= 1}
              >
                <Minus size={20} color={qty <= 1 ? colors.textMuted : colors.primary} strokeWidth={2.5} />
              </Pressable>
            </View>
          </View>
        </ScrollView>

        {/* Add to cart button */}
        <Pressable
          style={[styles.addBtn, outOfStock && styles.addBtnDisabled]}
          onPress={handleAdd}
          disabled={outOfStock || (hasVariants && !selectedVariant)}
        >
          <ShoppingCart size={20} color="#fff" />
          <Text style={styles.addBtnText}>
            {outOfStock ? 'نفد المخزون' : `إضافة للسلة — ${totalPrice} ₪`}
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing[6],
    maxHeight: '85%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 12 },
      web: { boxShadow: '0 -4px 12px rgba(0,0,0,0.1)' },
    }),
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing[3],
  },
  closeBtn: {
    position: 'absolute',
    top: spacing[3],
    left: spacing[4],
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.border + '60',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  imageWrap: {
    width: '100%',
    height: 180,
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: spacing[4],
    backgroundColor: colors.border + '40',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  infoBlock: {
    alignItems: 'flex-end',
    marginBottom: spacing[4],
  },
  productName: {
    fontSize: fontSizes['2xl'],
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: 4,
  },
  productDesc: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    textAlign: 'right',
    lineHeight: 20,
  },
  variantsBlock: {
    marginBottom: spacing[4],
  },
  variantsLabel: {
    fontSize: fontSizes.base,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: spacing[3],
  },
  variantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    justifyContent: 'flex-end',
  },
  variantCard: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    alignItems: 'flex-end',
    minWidth: 90,
    backgroundColor: '#FFFFFF',
  },
  variantCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '0D',
  },
  variantCardSoldOut: {
    opacity: 0.45,
    backgroundColor: colors.border + '40',
  },
  variantName: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  variantPrice: {
    fontSize: fontSizes.xs,
    fontFamily: fontFamily.semibold,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },
  variantTextSelected: {
    color: colors.primary,
  },
  variantTextMuted: {
    color: colors.textMuted,
  },
  lowStockBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    alignSelf: 'flex-end',
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  lowStockText: {
    fontSize: fontSizes.xs,
    fontFamily: fontFamily.semibold,
    color: '#92400E',
  },
  qtyBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[5],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  qtyLabel: {
    fontSize: fontSizes.base,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnDisabled: {
    opacity: 0.4,
  },
  qtyValue: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    minWidth: 28,
    textAlign: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    height: 56,
    marginTop: spacing[2],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  addBtnDisabled: {
    backgroundColor: colors.border,
  },
  addBtnText: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamily.bold,
    color: '#FFFFFF',
  },
});
