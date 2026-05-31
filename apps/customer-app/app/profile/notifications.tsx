import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, BellOff, ShoppingBag, CheckCheck } from 'lucide-react-native';
import { colors, fontSizes, fontFamily, spacing, radius } from '../../src/theme';
import { useNotificationsStore, AppNotification } from '../../src/stores/notifications.store';

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  return `منذ ${Math.floor(diff / 86400)} يوم`;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const items = useNotificationsStore((s) => s.items);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);

  // Mark everything read once the user opens this screen.
  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  const openNotification = (n: AppNotification) => {
    const orderId = n.data?.['orderId'];
    if (orderId) router.push({ pathname: '/tracking', params: { orderId } });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <ArrowRight size={24} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>الإشعارات</Text>
        </View>
        {items.length > 0 && (
          <Pressable style={styles.iconBtn} onPress={markAllRead}>
            <CheckCheck size={24} color={colors.primary} />
          </Pressable>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <BellOff size={56} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>لا توجد إشعارات بعد</Text>
          <Text style={styles.emptyHint}>ستظهر هنا تحديثات طلباتك والعروض.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.list}>
            {items.map((n) => (
              <Pressable
                key={n.id}
                style={[styles.card, !n.read && styles.cardUnread]}
                onPress={() => openNotification(n)}
              >
                {!n.read && <View style={styles.unreadIndicator} />}
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '15' }]}>
                  <ShoppingBag size={24} color={colors.primary} />
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{n.title}</Text>
                    <Text style={styles.timeText}>{timeAgo(n.receivedAt)}</Text>
                  </View>
                  <Text style={styles.cardBody}>{n.body}</Text>
                  {n.data?.['orderId'] ? <Text style={styles.linkText}>تتبع الطلب</Text> : null}
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    height: 64,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...(Platform.OS === 'web' ? { position: 'sticky', top: 0, zIndex: 10 } : {}),
  },
  headerRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing[2],
  },
  iconBtn: {
    padding: spacing[1],
  },
  headerTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSizes.xl,
    color: colors.primary,
  },
  content: {
    paddingVertical: spacing[6],
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[8],
  },
  emptyTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
  },
  emptyHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  filtersScroll: {
    marginBottom: spacing[6],
  },
  filtersContent: {
    paddingHorizontal: spacing[4],
    flexDirection: 'row-reverse',
    gap: spacing[2],
  },
  filterPill: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  filterTextActive: {
    color: colors.white,
  },
  list: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSizes.base,
    color: colors.textMuted,
    marginBottom: spacing[2],
    textAlign: 'right',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    flexDirection: 'row-reverse',
    gap: spacing[3],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    }),
  },
  cardUnread: {
    borderRightWidth: 4,
    borderRightColor: colors.primary,
  },
  unreadIndicator: {
    position: 'absolute',
    top: spacing[4],
    left: spacing[4],
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[1],
  },
  cardTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing[2],
  },
  timeText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  cardBody: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'right',
    lineHeight: 20,
    marginBottom: spacing[2],
  },
  linkText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.sm,
    color: colors.primary,
    textDecorationLine: 'underline',
    textAlign: 'right',
  },
  btnSmall: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1],
    borderRadius: radius.md,
    marginTop: spacing[2],
  },
  btnSmallText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.sm,
    color: colors.white,
  },
  imageCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    }),
  },
  imageHeader: {
    height: 128,
    width: '100%',
    position: 'relative',
  },
  promoImg: {
    width: '100%',
    height: '100%',
  },
  imgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: spacing[4],
  },
  badge: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: colors.white,
  },
  imageCardBody: {
    padding: spacing[4],
    flexDirection: 'row-reverse',
    gap: spacing[3],
  },
});
