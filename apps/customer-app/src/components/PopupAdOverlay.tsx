import { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Linking,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { X, ExternalLink } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { popupAdsApi, BASE_URL } from '@shu/api-client';
import type { PopupAd } from '@shu/api-client';
import { colors, fontFamily, fontSizes, radius, spacing } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const mediaUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
};

interface Props {
  page?: string;
}

// Track which ad IDs have been shown in this session (keyed by intervalHours)
const sessionShown = new Set<string>();

export function PopupAdOverlay({ page = 'home' }: Props) {
  const [visible, setVisible] = useState(false);
  const [currentAd, setCurrentAd] = useState<PopupAd | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const { data: ads = [] } = useQuery({
    queryKey: ['popup-ads', page],
    queryFn: () => popupAdsApi.list(page),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!ads.length) return;

    // Find first ad that hasn't been shown in this session (or is set to always show)
    const now = Date.now();
    const adToShow = (ads as PopupAd[]).find((ad) => {
      if (ad.intervalHours === 0) return true; // always show
      const key = `popup_${ad.id}`;
      const lastShown = sessionShown.has(key) ? null : null;
      return !sessionShown.has(key);
    });

    if (!adToShow) return;

    // Small delay so home screen renders first
    const timer = setTimeout(() => {
      setCurrentAd(adToShow);
      setVisible(true);
      sessionShown.add(`popup_${adToShow.id}`);
    }, 800);

    return () => clearTimeout(timer);
  }, [ads]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 70,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  const handleClose = () => setVisible(false);

  const handleCta = () => {
    if (currentAd?.buttonUrl) {
      Linking.openURL(currentAd.buttonUrl).catch(() => {});
    }
    setVisible(false);
  };

  if (!currentAd) return null;

  const imageUri = mediaUrl(currentAd.imageUrl);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={handleClose} />

        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          {/* Close button */}
          <Pressable
            style={styles.closeBtn}
            onPress={handleClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={18} color={colors.textPrimary} strokeWidth={2.5} />
          </Pressable>

          {/* Ad image */}
          {imageUri && (
            <View style={styles.imageWrap}>
              <Image
                source={{ uri: imageUri }}
                style={styles.image}
                contentFit="cover"
              />
              {/* Subtle gradient overlay at bottom */}
              <View style={styles.imageOverlay} />
            </View>
          )}

          {/* Content */}
          {currentAd.title && (
            <View style={styles.content}>
              <Text style={styles.title}>{currentAd.title}</Text>
            </View>
          )}

          {/* CTA Button */}
          {currentAd.buttonText && (
            <Pressable style={styles.ctaBtn} onPress={handleCta}>
              <Text style={styles.ctaText}>{currentAd.buttonText}</Text>
              {currentAd.buttonUrl && (
                <ExternalLink size={16} color="#fff" style={{ marginStart: spacing[2] }} />
              )}
            </Pressable>
          )}

          {/* Skip link */}
          <Pressable style={styles.skipRow} onPress={handleClose}>
            <Text style={styles.skipText}>إغلاق</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const CARD_WIDTH = SCREEN_WIDTH - spacing[8] * 2;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[8],
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    // gradient effect via opacity layers
  },
  content: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.xl,
    color: colors.textPrimary,
    textAlign: 'right',
    lineHeight: 28,
  },
  ctaBtn: {
    marginHorizontal: spacing[5],
    marginTop: spacing[3],
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.base,
    color: '#fff',
  },
  skipRow: {
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
  skipText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
});
