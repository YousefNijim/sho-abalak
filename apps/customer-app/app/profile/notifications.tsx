import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  MoreVertical,
  ShoppingBag,
  Tag,
  ShieldCheck,
  CheckCircle2,
  Utensils,
} from 'lucide-react-native';
import { colors, fontSizes, fontFamily, spacing, radius } from '../../../src/theme';

export default function NotificationsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState('الكل');

  const filters = ['الكل', 'الطلبات', 'العروض', 'النظام'];

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
        <Pressable style={styles.iconBtn}>
          <MoreVertical size={24} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersContent}>
          {filters.map((f) => {
            const isActive = filter === f;
            return (
              <Pressable
                key={f}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{f}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.list}>
          {/* Section: Today */}
          <Text style={styles.sectionTitle}>اليوم</Text>

          {/* Order Update (Unread) */}
          <View style={[styles.card, styles.cardUnread]}>
            <View style={styles.unreadIndicator} />
            <View style={[styles.iconWrap, { backgroundColor: colors.primary + '15' }]}>
              <ShoppingBag size={24} color={colors.primary} />
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>تم تحديث حالة طلبك</Text>
                <Text style={styles.timeText}>منذ دقيقتين</Text>
              </View>
              <Text style={styles.cardBody}>طلبك رقم #123456 غادر المطعم وهو في طريقه إليك الآن.</Text>
              <Pressable>
                <Text style={styles.linkText}>تتبع الطلب</Text>
              </Pressable>
            </View>
          </View>

          {/* Promotion */}
          <View style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: colors.secondary + '20' }]}>
              <Tag size={24} color={colors.secondary} />
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>خصم خاص بمناسبة العيد!</Text>
                <Text style={styles.timeText}>١ ساعة</Text>
              </View>
              <Text style={styles.cardBody}>استخدم الكود EID20 واحصل على خصم 20% على طلبك القادم من حلوياتنا التقليدية.</Text>
            </View>
          </View>

          {/* Section: Yesterday */}
          <Text style={[styles.sectionTitle, { marginTop: spacing[6] }]}>أمس</Text>

          {/* System Alert */}
          <View style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: colors.info + '20' }]}>
              <ShieldCheck size={24} color={colors.info} />
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>تم تسجيل دخول جديد</Text>
                <Text style={styles.timeText}>أمس، ٩:٠٠ م</Text>
              </View>
              <Text style={styles.cardBody}>تم رصد عملية تسجيل دخول لحسابك من متصفح جديد في مدينة رام الله.</Text>
            </View>
          </View>

          {/* Delivery Success */}
          <View style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: colors.success + '20' }]}>
              <CheckCircle2 size={24} color={colors.success} />
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>تم التوصيل بنجاح</Text>
                <Text style={styles.timeText}>أمس، ٨:٣٠ م</Text>
              </View>
              <Text style={styles.cardBody}>نأمل أنك استمتعت بوجبتك! شاركنا تقييمك لمساعدتنا على التحسن.</Text>
              <Pressable style={styles.btnSmall}>
                <Text style={styles.btnSmallText}>تقييم الطلب</Text>
              </Pressable>
            </View>
          </View>

          {/* Promotion Image Notification */}
          <View style={styles.imageCard}>
            <View style={styles.imageHeader}>
              <Image
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB9TEJU96A19oaf389I4sMbO5n0fBdrsTbsTvV2_F_4ulANfyJUoFvkTi_RwfA8rkxibv2JclYpaXVhHWdZH70Dy7Dd6msdqwwZNHYcxaCZDALWNxbvwvmmNrdd-AFc5VC47vrG8cTlE2zwDIu7SHGRSBlqPtQY6_cozuTwGH-mqiW4Ez0CNhVDtBktrqTRAKFj-0TxdKDOBkO6PO72dkveHYfTVgxov0HMOnD_f-_8u1-IOKBevctBlqcIbEGkQptcuj_Xp_B05WY_' }}
                style={styles.promoImg}
                contentFit="cover"
              />
              <View style={styles.imgOverlay}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>عرض حصري</Text>
                </View>
              </View>
            </View>
            <View style={styles.imageCardBody}>
              <View style={[styles.iconWrap, { backgroundColor: colors.primary + '15' }]}>
                <Utensils size={24} color={colors.primary} />
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>جديد في منطقتك!</Text>
                  <Text style={styles.timeText}>أمس، ٦:١٥ م</Text>
                </View>
                <Text style={styles.cardBody}>مطعم "النكهة الأصيلة" انضم إلينا مؤخراً. جرب أطباقهم المميزة الآن.</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
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
