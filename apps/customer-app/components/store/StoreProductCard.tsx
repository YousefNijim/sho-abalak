import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Plus } from 'lucide-react-native';
import type { Product } from '@shu/api-client';
import { colors, radius, fontSizes, fontFamily, spacing } from '../../../src/theme';
import { BASE_URL } from '@shu/api-client';

const mediaUrl = (path: string | null | undefined): string | null =>
  !path ? null : path.startsWith('http') ? path : `${BASE_URL}${path}`;

interface Props {
  product: Product;
  discountPct: number;
  onAdd: () => void;
  width: number | string;
}

export function StoreProductCard({ product, discountPct, onAdd, width }: Props) {
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock !== null && product.stock <= (product.lowStockAlert || 5) && product.stock > 0;
  
  const originalPrice = product.price;
  const finalPrice = discountPct > 0 ? originalPrice * (1 - discountPct / 100) : originalPrice;

  // Determine price label
  let priceStr = `${finalPrice.toFixed(2)} ش`;
  if (product.hasVariants) {
    priceStr = `من ${priceStr}`;
  } else if (product.unit) {
    priceStr = `${priceStr} / ${product.unit}`;
  }

  const img = mediaUrl(product.imageUrl);

  return (
    <View style={[styles.card, { width }]}>
      <View style={styles.imageContainer}>
        {img ? (
          <Image source={{ uri: img }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.placeholder]} />
        )}

        {discountPct > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>خصم {discountPct}%</Text>
          </View>
        )}

        {isOutOfStock && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>نفد المخزون</Text>
          </View>
        )}
        
        {!isOutOfStock && isLowStock && (
          <View style={styles.lowStockBadge}>
            <Text style={styles.lowStockText}>آخر {product.stock} قطع</Text>
          </View>
        )}
      </View>

      <View style={styles.details}>
        <Text style={[styles.name, !product.isAvailable && styles.unavailableText]} numberOfLines={2}>
          {product.name}
        </Text>

        <View style={styles.footer}>
          <View>
            <Text style={styles.price}>{priceStr}</Text>
            {discountPct > 0 && (
              <Text style={styles.originalPrice}>{originalPrice.toFixed(2)} ش</Text>
            )}
          </View>

          {!isOutOfStock && product.isAvailable && (
            <Pressable
              style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.8 }]}
              onPress={onAdd}
            >
              <Plus size={20} color={colors.white} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.background,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: colors.border,
  },
  details: {
    padding: spacing.sm,
  },
  name: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.sm,
    color: colors.text,
    lineHeight: 18,
    minHeight: 36, // Reserve space for 2 lines
    marginBottom: spacing.xs,
    writingDirection: 'rtl',
  },
  unavailableText: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  price: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.sm,
    color: colors.primary,
  },
  originalPrice: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: colors.secondary,
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.md,
    color: colors.error,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  lowStockBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  lowStockText: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: colors.white,
  },
  discountBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: colors.error,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  discountText: {
    color: colors.white,
    fontFamily: fontFamily.bold,
    fontSize: 10,
  },
});
