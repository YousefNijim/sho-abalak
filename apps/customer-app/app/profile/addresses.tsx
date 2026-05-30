import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Platform, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  Bell,
  Home,
  Briefcase,
  Heart,
  Edit2,
  Trash2,
  MapPin,
  MapPinPlus,
} from 'lucide-react-native';
import { colors, fontSizes, fontFamily, spacing, radius } from '../../src/theme';

export default function AddressesScreen() {
  const router = useRouter();

  const handleDelete = () => {
    Alert.alert('حذف العنوان', 'هل أنت متأكد من حذف هذا العنوان؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => {} }
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <ArrowRight size={24} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>عناويني المحفوظة</Text>
        </View>
        <Pressable style={styles.iconBtn}>
          <Bell size={24} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Header Visual Card */}
        <View style={styles.visualCard}>
          <Image
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBvLP3Kjoytn1QlUa4eoVjxcQPeN-jzL2xt-kiHh-quzifdi42kMCF-IoKlonMLX5_r3LuQOsqNOfnkpH51PCtdQF70bYYC3FCQpDDwIBOtaP0fbQMis-1mE043TstEH7hVXv7A_C-uGKGaHIC8zSb1WvjgglHc6xEEBWqBGxmKPCbK8La-Ez1lLRlIYZayqo1VKiuUD_eg79P1AL5NLqKU1-XCGpHzBS1iui_jUPNoqI2p1XviqpBAuNLDHpXqU6Dv-cfTfI8HEuS2' }}
            style={styles.visualImage}
            contentFit="cover"
          />
          <View style={styles.visualOverlay}>
            <Text style={styles.visualTitle}>سهّل وصولنا إليك</Text>
            <Text style={styles.visualSub}>أضف عناوينك المفضلة لتجربة طلب أسرع</Text>
          </View>
        </View>

        {/* Address List */}
        <View style={styles.list}>
          
          {/* Home */}
          <View style={styles.addressCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '15' }]}>
                  <Home size={24} color={colors.primary} />
                </View>
                <View style={styles.cardTextWrap}>
                  <Text style={styles.cardTitle}>المنزل</Text>
                  <Text style={styles.cardAddress}>نابلس، شارع رفيديا، عمارة القدس، الطابق الثالث</Text>
                </View>
              </View>
              <View style={styles.actions}>
                <Pressable style={styles.actionBtn}>
                  <Edit2 size={20} color={colors.primary} />
                </Pressable>
                <Pressable style={styles.actionBtn} onPress={handleDelete}>
                  <Trash2 size={20} color={colors.error} />
                </Pressable>
              </View>
            </View>
          </View>

          {/* Work */}
          <View style={styles.addressCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <View style={[styles.iconWrap, { backgroundColor: colors.secondary + '20' }]}>
                  <Briefcase size={24} color={colors.secondary} />
                </View>
                <View style={styles.cardTextWrap}>
                  <Text style={styles.cardTitle}>العمل</Text>
                  <Text style={styles.cardAddress}>رام الله، الماصيون، مركز الحصاد التجاري، مكتب ٤٠٢</Text>
                </View>
              </View>
              <View style={styles.actions}>
                <Pressable style={styles.actionBtn}>
                  <Edit2 size={20} color={colors.primary} />
                </Pressable>
                <Pressable style={styles.actionBtn} onPress={handleDelete}>
                  <Trash2 size={20} color={colors.error} />
                </Pressable>
              </View>
            </View>
          </View>

          {/* Family */}
          <View style={styles.addressCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <View style={[styles.iconWrap, { backgroundColor: colors.info + '20' }]}>
                  <Heart size={24} color={colors.info} />
                </View>
                <View style={styles.cardTextWrap}>
                  <Text style={styles.cardTitle}>بيت العائلة</Text>
                  <Text style={styles.cardAddress}>بيت لحم، بيت جالا، قرب الكنيسة، رقم المنزل ١٢٤</Text>
                </View>
              </View>
              <View style={styles.actions}>
                <Pressable style={styles.actionBtn}>
                  <Edit2 size={20} color={colors.primary} />
                </Pressable>
                <Pressable style={styles.actionBtn} onPress={handleDelete}>
                  <Trash2 size={20} color={colors.error} />
                </Pressable>
              </View>
            </View>
          </View>

        </View>
        
        {/* Empty State Preview (just visual decoration) */}
        <View style={styles.emptyDecoration}>
          <MapPin size={64} color={colors.textMuted} opacity={0.4} />
          <Text style={styles.emptyText}>لم يتبق الكثير من المواقع؟</Text>
        </View>

      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <Pressable style={styles.addBtn}>
          <Text style={styles.addBtnText}>إضافة عنوان جديد</Text>
          <MapPinPlus size={24} color={colors.white} />
        </Pressable>
      </View>

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
    padding: spacing[4],
    paddingBottom: 100, // Make room for bottom bar
  },
  visualCard: {
    height: 192,
    width: '100%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing[6],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    }),
  },
  visualImage: {
    width: '100%',
    height: '100%',
  },
  visualOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    padding: spacing[4],
  },
  visualTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSizes.xl,
    color: colors.white,
    textAlign: 'right',
  },
  visualSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.base,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'right',
  },
  list: {
    gap: spacing[4],
  },
  addressCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: 'transparent',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    }),
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: {
    flexDirection: 'row-reverse',
    flex: 1,
    gap: spacing[3],
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  cardTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cardAddress: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'right',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row-reverse',
    gap: spacing[2],
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyDecoration: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[12],
    opacity: 0.8,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.base,
    color: colors.textMuted,
    marginTop: spacing[4],
    opacity: 0.6,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 8 },
      web: { boxShadow: '0 -4px 20px rgba(0,0,0,0.05)' },
    }),
  },
  addBtn: {
    width: '100%',
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  addBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.base,
    color: colors.white,
  },
});
