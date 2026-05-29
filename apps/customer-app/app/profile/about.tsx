import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Platform, Linking } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  Handshake,
  Eye,
  Facebook,
  Instagram,
  Globe,
  Mail,
} from 'lucide-react-native';
import { colors, fontSizes, fontFamily, spacing, radius } from '../../../src/theme';

export default function AboutScreen() {
  const router = useRouter();

  const handleLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowRight size={24} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>من نحن</Text>
        </View>
        <Text style={styles.headerAppTitle}>شو عبالك؟</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.logoContainer}>
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBJWruajV8i6Scr54hDiW8OFW71EP8uEtlqsyT1O3oVwWwlFZjTm-fGcvk3Z91ZeUOXyG671FZc5sCUqDoCAYNoSENOrjmrFNe0jlgYpUR-twYPEVYZlBnaotMA9rI0-AkcKjQ7f7vFprDh799ylYJAUWY21lxk5WyIbV5axf3vRae_SB59v21cELhcJLYZJz0H9iSavRvpSHMfJVGOkMVr4ZdsfjgjCvOphvg4NJj_66s01YE4xuU8rT0zuCGRGhnPZsZSRGpp03FT' }}
              style={styles.logo}
              contentFit="cover"
            />
          </View>
          <Text style={styles.title}>شو عبالك؟</Text>
          <View style={styles.subtitleBadge}>
            <Text style={styles.subtitleText}>تراثنا، بضغطة زر</Text>
          </View>
        </View>

        {/* Mission Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Handshake size={32} color={colors.warning} />
            <Text style={styles.cardTitle}>رسالتنا</Text>
          </View>
          <Text style={styles.cardBody}>
            من قلب فلسطين، انطلقت منصة "شو عبالك؟" لتكون الجسر الذي يربط بين أصالة الإنتاج المحلي وسرعة العصر الرقمي. نسعى لتمكين المشاريع الصغيرة والمتوسطة في الضفة الغربية، وتوفير منصة عرض تليق بجودة منتجاتنا الوطنية.
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>+١٠٠</Text>
            <Text style={styles.statLabel}>شريك محلي</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: colors.secondary }]}>١٠٠٪</Text>
            <Text style={styles.statLabel}>دعم وطني</Text>
          </View>
        </View>

        {/* Visual Support Card */}
        <View style={styles.visualCard}>
          <Image
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCiRyav4mROW0D88qj4UR5W4GZQc4Uyql1msVpj_WOK88pcgTD1rSc8WdkiFmeG3k9_w1oHuj1SrvY16-kPf3gHdmnFLR_0lByBavH_qJqAmzB5CXCc3Q4VH3jPWiE2OdyAY_KZcbw8cUIb6gAkohUery4qyr50chfVeMyoA3dsShbhAXjTK3sSVQyHkBwU3CYxlMLcd0uChRKPWUo_8wn8T56_AmniHfti90t0P6MYk9hYIpyaqWKpAAD5Hh8tGlhCttfg9WT3Kfat' }}
            style={styles.visualImage}
            contentFit="cover"
          />
          <View style={styles.visualOverlay}>
            <Text style={styles.visualText}>ندعم مجتمعنا، ننمو معاً</Text>
          </View>
        </View>

        {/* Vision Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Eye size={32} color={colors.primary} />
            <Text style={styles.cardTitle}>رؤيتنا</Text>
          </View>
          <Text style={styles.cardBody}>
            أن نصبح الخيار الأول للمستهلك الفلسطيني، حيث يجد كل ما يتمناه من منتجات وخدمات بكل سهولة، مع الحفاظ على روح الهوية الفلسطينية في كل تفصيل من تفاصيل تجربته الرقمية.
          </Text>
        </View>

        {/* Social Media */}
        <View style={styles.socialSection}>
          <Text style={styles.socialTitle}>تابعنا على</Text>
          <View style={styles.socialLinks}>
            <Pressable style={styles.socialIcon} onPress={() => handleLink('https://facebook.com')}>
              <Facebook size={24} color={colors.primary} />
            </Pressable>
            <Pressable style={styles.socialIcon} onPress={() => handleLink('https://instagram.com')}>
              <Instagram size={24} color={colors.primary} />
            </Pressable>
            <Pressable style={styles.socialIcon} onPress={() => handleLink('https://shu-abalak.com')}>
              <Globe size={24} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        {/* Contact CTA */}
        <Pressable style={styles.contactBtn} onPress={() => handleLink('mailto:support@shu-abalak.com')}>
          <Text style={styles.contactBtnText}>تواصل معنا</Text>
          <Mail size={24} color={colors.white} />
        </Pressable>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>إصدار التطبيق ٢.٤.٠</Text>
          <Text style={styles.footerText}>جميع الحقوق محفوظة © ٢٠٢٦ شو عبالك؟</Text>
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
  backBtn: {
    padding: spacing[1],
  },
  headerTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSizes.xl,
    color: colors.primary,
  },
  headerAppTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.xl,
    color: colors.primary,
  },
  content: {
    padding: spacing[4],
    paddingBottom: spacing[10],
  },
  hero: {
    alignItems: 'center',
    marginTop: spacing[6],
    marginBottom: spacing[8],
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E6781E',
    borderWidth: 4,
    borderColor: colors.white,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[5],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 6 },
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
    }),
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes['4xl'],
    color: colors.primary,
    marginBottom: spacing[2],
  },
  subtitleBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
  },
  subtitleText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSizes.lg,
    color: '#abefbd', // matches text-secondary-container in HTML roughly
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing[6],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing[4],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  cardTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes['2xl'],
    color: colors.textPrimary,
  },
  cardBody: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.lg,
    color: colors.textMuted,
    lineHeight: 28,
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row-reverse',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(229, 224, 213, 0.5)',
    padding: spacing[4],
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes['3xl'],
    color: colors.primary,
  },
  statLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  visualCard: {
    height: 192,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing[4],
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
  visualText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSizes.xl,
    color: colors.white,
    textAlign: 'right',
  },
  socialSection: {
    alignItems: 'center',
    marginVertical: spacing[8],
  },
  socialTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSizes.xl,
    color: colors.textPrimary,
    marginBottom: spacing[5],
  },
  socialLinks: {
    flexDirection: 'row',
    gap: spacing[5],
  },
  socialIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
    }),
  },
  contactBtn: {
    width: '100%',
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginBottom: spacing[8],
    ...Platform.select({
      ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
      web: { boxShadow: `0 4px 12px ${colors.primary}40` },
    }),
  },
  contactBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.base,
    color: colors.white,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: spacing[4],
  },
  footerText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing[1],
  },
});
