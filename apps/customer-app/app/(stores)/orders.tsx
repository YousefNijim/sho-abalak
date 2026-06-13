import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, Platform, RefreshControl } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';
import { ordersApi, BASE_URL } from '@shu/api-client';
import type { Order } from '@shu/api-client';

const mediaUrl = (path: string | null | undefined): string | null =>
  !path ? null : path.startsWith('http') ? path : `${BASE_URL}${path}`;
import { useCartStore } from '../../src/stores/cart.store';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Navigation, RefreshCcw } from 'lucide-react-native';
import { NotificationBell } from '../../src/components/NotificationBell';

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  PENDING: { label: 'بانتظار التأكيد', bg: '#ffedd5', fg: '#F59E0B' }, // warning-amber
  CONFIRMED: { label: 'تم التأكيد', bg: '#ffedd5', fg: '#F59E0B' },
  PREPARING: { label: 'تجهيز المشتريات', bg: '#ffedd5', fg: '#F59E0B' },
  READY: { label: 'جاهز للتوصيل', bg: '#ffedd5', fg: '#F59E0B' },
  PICKED_UP: { label: 'في الطريق', bg: '#ffedd5', fg: '#F59E0B' },
  DELIVERED: { label: 'تم التوصيل', bg: '#dcfce7', fg: '#22C55E' }, // success-green
  CANCELLED: { label: 'ملغى', bg: '#fee2e2', fg: '#EF4444' }, // error-red
};

export default function Orders() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'CURRENT' | 'PREVIOUS'>('CURRENT');

  const addItem = useCartStore((s) => s.addItem);
  const clearCart = useCartStore((s) => s.clear);

  // Fetch orders from API
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', 'STORE'],
    queryFn: () => ordersApi.list({ businessType: 'STORE' }),
  });

  const current = orders.filter((o: any) =>
    ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP'].includes(o.status),
  );
  const past = orders.filter((o: any) =>
    ['DELIVERED', 'CANCELLED'].includes(o.status),
  );
  const list = tab === 'CURRENT' ? current : past;

  const handleReorder = (o: Order) => {
    clearCart();
    const areaId = o.business?.area?.id || '';
    o.items?.forEach((it) => {
      for (let i = 0; i < it.quantity; i++) {
        addItem(
          {
            productId: it.productId,
            name: it.product?.name || 'منتج',
            price: it.unitPrice,
            variantId: it.variantId,
            variantName: it.variantName,
            imageUrl: it.product?.imageUrl,
          },
          o.businessId,
          areaId,
          'STORE',
        );
      }
    });
    router.push('/cart');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['orders'] });
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ar-EG', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <Text style={styles.headerTitle}>طلباتي</Text>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <Pressable
            style={[styles.tab, tab === 'CURRENT' && styles.tabActive]}
            onPress={() => setTab('CURRENT')}
          >
            <Text style={[styles.tabText, tab === 'CURRENT' && styles.tabTextActive]}>الحالية</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, tab === 'PREVIOUS' && styles.tabActive]}
            onPress={() => setTab('PREVIOUS')}
          >
            <Text style={[styles.tabText, tab === 'PREVIOUS' && styles.tabTextActive]}>السابقة</Text>
          </Pressable>
        </View>

        {/* Orders List */}
        {isLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />
            }
          >
            {list.map((o: any) => {
              const s = STATUS[o.status] || { label: o.status, bg: '#f5f2fc', fg: colors.textPrimary };
              const itemsCount = o.items?.reduce((acc: number, it: any) => acc + Number(it.quantity), 0) ?? 0;
              const isCurrent = tab === 'CURRENT';

              return (
                <View key={o.id} style={styles.orderCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.imageWrap}>
                      <Image
                        source={{ uri: mediaUrl(o.items?.[0]?.product?.imageUrl) || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAk6EFQ9tFTf-fSVtxgqPRtMcZMtI0n85_zZeE3MGUrOSboQ4HbNb8zzqe5x5HKTprRX3V6plSTrpmrehgmwjfLMLdhi9yNyc_bZq05olKaLEqM3siOyTkqQrZYj8_Z6Sl_mq5U4kxTNWT1WwXupD0-5AurOUz_yLb2qdY9s31lI8BET-Mu4QC3U23X2C7cTw5xb32X5hzjOZLyyKikqRKlit1zHT8yEhEPydomSjKSJJGPE0onJegyY1vmlPRq5jWTp3HNQ-nQK_x4' }}
                        style={styles.cardImage}
                        contentFit="cover"
                      />
                    </View>
                    <View style={styles.cardHeaderInfo}>
                      <View style={styles.cardTitleRow}>
                        <Text style={styles.businessName} numberOfLines={1}>{o.business?.name || 'منشأة شو عبالك'}</Text>
                        <View style={[styles.badge, { backgroundColor: s.bg }]}>
                          <Text style={[styles.badgeText, { color: s.fg }]}>{s.label}</Text>
                        </View>
                      </View>
                      <Text style={styles.dateText}>{formatDate(o.createdAt)}</Text>
                    </View>
                  </View>

                  {/* List of items */}
                  {o.items && o.items.length > 0 && (
                    <View style={{ marginTop: spacing[3], marginBottom: spacing[1] }}>
                      {o.items.map((it: any) => (
                        <Text key={it.id} style={{ fontSize: 13, color: colors.textMuted, textAlign: 'right' }}>
                          {it.product?.name} (x{it.quantity})
                        </Text>
                      ))}
                    </View>
                  )}

                  <View style={styles.cardFooter}>
                    <View style={styles.footerInfo}>
                      <Text style={styles.itemsCountText}>{itemsCount} أصناف</Text>
                      <Text style={styles.totalPriceText}>{o.total} ₪</Text>
                    </View>
                    
                    {isCurrent ? (
                      <Pressable
                        style={styles.actionBtn}
                        onPress={() => router.push(`/(stores)/track/${o.id}` as any)}
                      >
                        <Navigation size={18} color={colors.primary} />
                        <Text style={styles.actionBtnText}>تتبع الطلب</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        style={styles.actionBtn}
                        onPress={() => handleReorder(o)}
                      >
                        <RefreshCcw size={18} color={colors.primary} />
                        <Text style={styles.actionBtnText}>إعادة الطلب</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
            
            {list.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>لا توجد طلبات</Text>
              </View>
            ) : null}
          </ScrollView>
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    backgroundColor: '#FCF3DC',
    zIndex: 40,
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
  iconBtn: {
    padding: spacing[1],
  },
  avatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffdbc7', // primary-fixed
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  headerTitle: {
    fontFamily: fontFamily.bold, // headline-lg-mobile
    fontSize: 26,
    color: colors.primary,
  },
  headerSpacer: {
    width: 40,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF', // surface-white
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229, 224, 213, 1)', // border-beige
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    }),
    marginBottom: spacing[6],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontFamily: fontFamily.semibold, // headline-sm
    fontSize: 20,
    color: colors.textMuted, // muted-gray
  },
  tabTextActive: {
    color: colors.primary,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    gap: spacing[4],
    paddingBottom: spacing[8],
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: 'transparent',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  imageWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    overflow: 'hidden',
    flexShrink: 0,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardHeaderInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  businessName: {
    fontFamily: fontFamily.semibold, // headline-sm
    fontSize: 20,
    color: colors.textPrimary, // on-surface
    flex: 1,
    textAlign: 'right',
  },
  badge: {
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
    borderRadius: radius.full,
    marginStart: spacing[2],
  },
  badgeText: {
    fontFamily: fontFamily.medium, // label-md
    fontSize: 13,
  },
  dateText: {
    fontFamily: fontFamily.medium, // label-sm
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'right',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: 'rgba(229, 224, 213, 1)', // border-beige
  },
  footerInfo: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  itemsCountText: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
  totalPriceText: {
    fontFamily: fontFamily.bold, // body-lg
    fontSize: 17,
    color: colors.primary,
  },
  actionBtn: {
    height: 44,
    paddingHorizontal: spacing[6],
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  actionBtnText: {
    fontFamily: fontFamily.bold, // button-text
    fontSize: 16,
    color: colors.primary,
  },
  emptyWrap: {
    marginTop: spacing[12],
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    fontSize: 16,
  },
});
