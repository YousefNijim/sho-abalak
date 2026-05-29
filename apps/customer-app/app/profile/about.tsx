import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';

export default function About() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.logoWrap}>
          {/* Using a placeholder view for the logo to match the theme */}
          <View style={styles.logo}>
            <Text style={styles.logoText}>شو عبالك؟</Text>
          </View>
          <Text style={styles.version}>الإصدار 1.0.0</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>من نحن</Text>
          <Text style={styles.text}>
            تطبيق "شو عبالك؟" هو منصتك الأولى لطلب الطعام والمقاضي في فلسطين.
            نحن نربطك بأفضل المطاعم والمتاجر المحلية مع خدمة توصيل سريعة وموثوقة.
          </Text>
          <Text style={styles.text}>
            رؤيتنا هي تسهيل حياتك اليومية من خلال توفير تجربة تسوق سلسة ومريحة تلبي جميع احتياجاتك.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.rights}>جميع الحقوق محفوظة © 2024</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing[6], flexGrow: 1 },
  logoWrap: { alignItems: 'center', marginBottom: spacing[8], marginTop: spacing[4] },
  logo: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[3] },
  logoText: { color: '#fff', fontFamily: fontFamily.bold, fontSize: fontSizes.xl },
  version: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: fontSizes.sm },
  content: { gap: spacing[3], flex: 1 },
  title: { fontSize: fontSizes.lg, fontFamily: fontFamily.bold, color: colors.textPrimary, textAlign: 'right', marginBottom: spacing[2] },
  text: { fontSize: fontSizes.base, fontFamily: fontFamily.regular, color: colors.textMuted, textAlign: 'right', lineHeight: 24 },
  footer: { alignItems: 'center', marginTop: spacing[8] },
  rights: { color: colors.textMuted, fontSize: fontSizes.xs, fontFamily: fontFamily.regular },
});
