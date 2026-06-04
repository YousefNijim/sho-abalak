import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Star, Clock, Bike, ImageIcon, Zap } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import type { PromotedBusiness } from '@shu/api-client';
import { BASE_URL } from '@shu/api-client';
import { colors, fontFamily, fontSizes, radius, spacing } from '../theme';

const mediaUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
};

interface Props {
  promoted: PromotedBusiness;
}

export function PromotedBusinessCard({ promoted }: Props) {
  const router = useRouter();
  const b = promoted.business;

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/business/${b.id}` as any)}
    >
      {/* Hero Image */}
      <View style={styles.imageWrap}>
        {b.imageUrl ? (
          <Image
            source={{ uri: mediaUrl(b.imageUrl)! }}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <ImageIcon size={44} color={colors.border} />
          </View>
        )}

        {/* Sponsored badge */}
        <View style={styles.sponsoredBadge}>
          <Zap size={11} color="#fff" fill="#fff" />
          <Text style={styles.sponsoredText}>ممول</Text>
        </View>

        {/* Open/Close badge */}
        <View style={[styles.statusBadge, b.isOpen ? styles.statusOpen : styles.statusClosed]}>
          <Text style={[styles.statusText, b.isOpen ? styles.statusTextOpen : styles.statusTextClosed]}>
            {b.isOpen ? 'مفتوح' : 'مغلق'}
          </Text>
        </View>

        {/* Glow border overlay */}
        <View style={styles.glowBorder} pointerEvents="none" />
      </View>

      {/* Card Body */}
      <View style={styles.body}>
        {/* Logo if present */}
        {b.logoUrl && (
          <View style={styles.logoWrap}>
            <Image
              source={{ uri: mediaUrl(b.logoUrl)! }}
              style={styles.logo}
              contentFit="cover"
            />
          </View>
        )}

        <View style={styles.textBlock}>
          {/* Name + Rating */}
          <View style={styles.nameRow}>
            <View style={styles.ratingWrap}>
              <Star size={14} color={colors.warning} fill={colors.warning} />
              <Text style={styles.ratingText}>
                {b.rating ? b.rating.toFixed(1) : '4.8'}
              </Text>
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {b.name}
            </Text>
          </View>

          {/* Tags */}
          {b.tags && b.tags.length > 0 && (
            <Text style={styles.tags} numberOfLines={1}>
              {b.tags.map((t: any) => t.name).join(' • ')}
            </Text>
          )}

          {/* Meta: time + delivery fee */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Bike size={15} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.primary, fontFamily: fontFamily.bold }]}>
                {b.area?.deliveryFee ?? 3} ₪
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Clock size={15} color={colors.textMuted} />
              <Text style={styles.metaText}>25-35 دقيقة</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Premium bottom accent bar */}
      <View style={styles.accentBar} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginHorizontal: spacing[4],
    marginBottom: spacing[5],
    // Multi-layer shadow for premium feel
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
    // Outer glow via border
    borderWidth: 1.5,
    borderColor: `${colors.primary}30`,
  },
  imageWrap: {
    width: '100%',
    height: 190,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowBorder: {
    position: 'absolute',
    inset: 0,
    borderWidth: 2,
    borderColor: `${colors.primary}40`,
    borderRadius: radius.lg,
  },
  sponsoredBadge: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  sponsoredText: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: '#fff',
  },
  statusBadge: {
    position: 'absolute',
    bottom: spacing[3],
    left: spacing[3],
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: 3,
  },
  statusOpen: {
    backgroundColor: 'rgba(22,90,52,0.9)',
  },
  statusClosed: {
    backgroundColor: 'rgba(107,114,128,0.85)',
  },
  statusText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.xs,
  },
  statusTextOpen: {
    color: '#fff',
  },
  statusTextClosed: {
    color: '#fff',
  },
  body: {
    flexDirection: 'row-reverse',
    padding: spacing[4],
    gap: spacing[3],
    alignItems: 'flex-start',
  },
  logoWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  textBlock: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF8F0',
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    marginStart: spacing[2],
  },
  ratingText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.xs,
    color: colors.textPrimary,
  },
  tags: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'right',
  },
  metaRow: {
    flexDirection: 'row-reverse',
    gap: spacing[4],
    marginTop: spacing[1],
  },
  metaItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  accentBar: {
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
    opacity: 0.85,
  },
});
