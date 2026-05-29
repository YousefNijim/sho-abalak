import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@shu/ui-components/native';
import { colors, fontSizes, radius, spacing } from '../../src/theme';

export default function Otp() {
  const router = useRouter();
  const [digits, setDigits] = useState(['', '', '', '']);
  const [seconds, setSeconds] = useState(60);
  const refs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (seconds === 0) return;
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const setDigit = (i: number, v: string) => {
    const next = [...digits];
    next[i] = v.slice(-1);
    setDigits(next);
    if (v && i < 3) refs.current[i + 1]?.focus();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>تحقق من هاتفك</Text>
      <Text style={styles.subtitle}>أرسلنا كوداً مكوّناً من 4 أرقام على رقمك</Text>

      <View style={styles.otpRow}>
        {digits.map((d, i) => (
          <TextInput
            key={i}
            ref={(r) => {
              refs.current[i] = r;
            }}
            style={[styles.otpBox, !!d && styles.otpBoxFilled]}
            keyboardType="number-pad"
            maxLength={1}
            value={d}
            onChangeText={(v) => setDigit(i, v)}
            textAlign="center"
          />
        ))}
      </View>

      <Text style={styles.timer}>
        {seconds > 0 ? `إعادة إرسال بعد ${seconds} ثانية` : 'إعادة إرسال الكود'}
      </Text>

      <Button title="تأكيد" onPress={() => router.replace('/(tabs)')} style={{ marginTop: spacing[6] }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing[5], backgroundColor: colors.background },
  title: { fontSize: fontSizes['2xl'], fontWeight: '700', color: colors.textPrimary, marginTop: spacing[6] },
  subtitle: { fontSize: fontSizes.base, color: colors.textMuted, marginTop: spacing[2] },
  otpRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: spacing[3], marginTop: spacing[8] },
  otpBox: {
    flex: 1, height: 64, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface, fontSize: fontSizes['2xl'], fontWeight: '700', color: colors.textPrimary,
  },
  otpBoxFilled: { borderColor: colors.primary },
  timer: { textAlign: 'center', color: colors.textMuted, marginTop: spacing[6], fontSize: fontSizes.sm },
});
