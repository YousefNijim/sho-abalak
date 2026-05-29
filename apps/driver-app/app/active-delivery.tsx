import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@shu/ui-components/native';
import { colors, fontSizes, radius, spacing } from '../src/theme';

const STEPS = ['استلام من المنشأة', 'في الطريق', 'تسليم للزبون'];

export default function ActiveDelivery() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: 24 }}>
        {/* Stepper */}
        <View style={styles.stepper}>
          {STEPS.map((s, i) => (
            <View key={s} style={styles.stepItem}>
              <View style={[styles.stepDot, i <= step && styles.stepDotActive]}>
                <Text style={[styles.stepNum, i <= step && { color: '#fff' }]}>{i + 1}</Text>
              </View>
              <Text style={styles.stepLabel}>{s}</Text>
            </View>
          ))}
        </View>

        {/* Business */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>المنشأة</Text>
          <Text style={styles.muted}>📍 مطعم القدس - رام الله، المصيون</Text>
          <Text style={styles.muted}>📞 02-298-XXXX</Text>
          <View style={styles.callBtn}><Text style={styles.callText}>اتصال</Text></View>
        </View>

        {/* Customer */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>الزبون</Text>
          <Text style={styles.muted}>سامي علي · نابلس - المركز</Text>
          <Text style={styles.muted}>📞 059X-XXX-XXX</Text>
          <View style={styles.callBtn}><Text style={styles.callText}>اتصال</Text></View>
        </View>

        {/* Cash callout */}
        <View style={styles.cash}>
          <Text style={styles.cashText}>💵 استلم 45 ₪ من الزبون (نقدي)</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {step < 2 ? (
          <Button
            title={step === 0 ? 'استلمت الطلب من المنشأة' : 'وصلت للزبون'}
            onPress={() => setStep((s) => s + 1)}
          />
        ) : (
          <Button title="تم التسليم ✅" variant="primary" onPress={() => router.replace('/(tabs)')} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row-reverse', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border },
  stepItem: { alignItems: 'center', flex: 1, gap: 6 },
  stepDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: colors.primary },
  stepNum: { fontWeight: '700', color: colors.textMuted },
  stepLabel: { fontSize: fontSizes.xs, color: colors.textPrimary, textAlign: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border, gap: 4 },
  cardTitle: { fontSize: fontSizes.base, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  muted: { color: colors.textMuted, fontSize: fontSizes.sm },
  callBtn: { backgroundColor: colors.secondary, borderRadius: radius.full, paddingHorizontal: spacing[4], paddingVertical: spacing[2], alignSelf: 'flex-start', marginTop: spacing[2] },
  callText: { color: '#fff', fontWeight: '700' },
  cash: { backgroundColor: '#FEF9C3', borderRadius: radius.md, padding: spacing[4] },
  cashText: { color: '#854D0E', fontWeight: '700', fontSize: fontSizes.base },
  footer: { padding: spacing[4], backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
