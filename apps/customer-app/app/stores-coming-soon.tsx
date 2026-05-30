import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, Store, Clock } from 'lucide-react-native';
import { colors, fontFamily, fontSizes, radius, spacing } from '../src/theme';

export default function StoresComingSoon() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
          <ArrowRight size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>المتاجر والسوبر ماركت</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <Store size={56} color={colors.secondary} strokeWidth={1.5} />
        </View>
        <View style={styles.badge}>
          <Clock size={16} color={colors.secondary} />
          <Text style={styles.badgeText}>قريباً</Text>
        </View>
        <Text style={styles.title}>قسم المتاجر قيد التحضير</Text>
        <Text style={styles.desc}>
          نعمل على إضافة السوبرماركت والمتاجر والخضار والملاحم إلى المنصة. ترقّب إطلاق هذا القسم قريباً!
        </Text>
        <Pressable style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>العودة للأقسام</Text>
        </Pressable>
      </View>
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
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSizes.xl, fontFamily: fontFamily.bold, color: colors.secondary },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6] },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(22,90,52,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  badge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: 'rgba(22,90,52,0.12)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    marginBottom: spacing[4],
  },
  badgeText: { fontSize: fontSizes.sm, fontFamily: fontFamily.bold, color: colors.secondary },
  title: {
    fontSize: fontSizes['2xl'],
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  desc: {
    fontSize: fontSizes.base,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing[6],
  },
  btn: {
    backgroundColor: colors.secondary,
    borderRadius: radius.full,
    paddingHorizontal: spacing[8],
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: fontSizes.base, fontFamily: fontFamily.bold, color: '#fff' },
});
