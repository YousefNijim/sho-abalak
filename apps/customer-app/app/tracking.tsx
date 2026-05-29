import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, radius, spacing } from '../src/theme';

const STEPS = [
  { label: 'تم استلام الطلب', state: 'done' },
  { label: 'تأكيد المنشأة', state: 'done' },
  { label: 'جاري التحضير', state: 'active' },
  { label: 'في الطريق إليك', state: 'pending' },
  { label: 'تم التسليم', state: 'pending' },
] as const;

export default function Tracking() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing[4] }}>
      <Text style={styles.heading}>طلبك من مطعم القدس</Text>
      <Text style={styles.eta}>وقت التوصيل المتوقع: 25-35 دقيقة</Text>

      {/* Stepper */}
      <View style={styles.stepper}>
        {STEPS.map((s, i) => {
          const color = s.state === 'done' ? colors.secondary : s.state === 'active' ? colors.primary : colors.border;
          return (
            <View key={s.label} style={styles.step}>
              <View style={styles.stepLeft}>
                <View style={[styles.dot, { backgroundColor: color }]}>
                  <Text style={styles.dotText}>{s.state === 'done' ? '✓' : s.state === 'active' ? '●' : ''}</Text>
                </View>
                {i < STEPS.length - 1 ? <View style={[styles.line, { backgroundColor: s.state === 'done' ? colors.secondary : colors.border }]} /> : null}
              </View>
              <Text style={[styles.stepLabel, s.state === 'pending' && { color: colors.textMuted }]}>{s.label}</Text>
            </View>
          );
        })}
      </View>

      {/* Driver */}
      <View style={styles.driver}>
        <View style={styles.driverAvatar}><Text style={{ fontSize: 28 }}>🛵</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.driverName}>كريم عبد الله</Text>
          <Text style={styles.muted}>سائق التوصيل</Text>
        </View>
        <View style={styles.callBtn}><Text style={styles.callText}>📞 اتصال</Text></View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: fontSizes.xl, fontWeight: '700', color: colors.textPrimary },
  eta: { color: colors.textMuted, marginTop: 4, marginBottom: spacing[6] },
  stepper: { gap: 0 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  stepLeft: { alignItems: 'center' },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dotText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  line: { width: 2, height: 32 },
  stepLabel: { fontSize: fontSizes.base, color: colors.textPrimary, fontWeight: '600', paddingTop: 4 },
  driver: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, marginTop: spacing[6] },
  driverAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  driverName: { fontSize: fontSizes.base, fontWeight: '700', color: colors.textPrimary },
  muted: { color: colors.textMuted, fontSize: fontSizes.sm },
  callBtn: { backgroundColor: colors.secondary, borderRadius: radius.full, paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  callText: { color: '#fff', fontWeight: '700' },
});
