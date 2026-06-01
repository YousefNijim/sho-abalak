import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, BellOff, ShoppingBag, CheckCheck } from 'lucide-react-native';
import { colors, fontSizes, fontFamily, spacing, radius } from '../src/theme';
import { useNotificationsStore, AppNotification } from '../src/stores/notifications.store';

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  return `منذ ${Math.floor(diff / 86400)} يوم`;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const items = useNotificationsStore((s) => s.items);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);

  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  const open = (n: AppNotification) => {
    const orderId = n.data?.['orderId'];
    if (orderId) router.push({ pathname: '/order/[id]', params: { id: orderId } });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
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
          <Text style={styles.emptyHint}>ستظهر هنا الطلبات الجديدة وتحديثاتها.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.list}>
            {items.map((n) => (
              <Pressable
                key={n.id}
                style={[styles.card, !n.read && styles.cardUnread]}
                onPress={() => open(n)}
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
                  {n.data?.['orderId'] ? <Text style={styles.linkText}>عرض الطلب</Text> : null}
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
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...(Platform.OS === 'web' ? { position: 'sticky' as any, top: 0, zIndex: 10 } : {}),
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  iconBtn: { padding: spacing[1] },
  headerTitle: { fontFamily: fontFamily.semibold, fontSize: fontSizes.xl, color: colors.primary },
  content: { paddingVertical: spacing[6] },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3], paddingHorizontal: spacing[8] },
  emptyTitle: { fontFamily: fontFamily.semibold, fontSize: fontSizes.lg, color: colors.textPrimary },
  emptyHint: { fontFamily: fontFamily.regular, fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'center' },
  list: { paddingHorizontal: spacing[4], gap: spacing[3] },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    flexDirection: 'row',
    gap: spacing[3],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    }),
  },
  cardUnread: { borderRightWidth: 4, borderRightColor: colors.primary },
  unreadIndicator: {
    position: 'absolute',
    top: spacing[4],
    left: spacing[4],
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  iconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing[1] },
  cardTitle: { fontFamily: fontFamily.semibold, fontSize: fontSizes.base, color: colors.textPrimary, flex: 1, textAlign: 'right', marginLeft: spacing[2] },
  timeText: { fontFamily: fontFamily.medium, fontSize: fontSizes.xs, color: colors.textMuted },
  cardBody: { fontFamily: fontFamily.regular, fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'right', lineHeight: 20, marginBottom: spacing[2] },
  linkText: { fontFamily: fontFamily.medium, fontSize: fontSizes.sm, color: colors.primary, textDecorationLine: 'underline', textAlign: 'right' },
});
