import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';

export default function ChangePassword() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSave = () => {
    if (!oldPassword || !newPassword) {
      Alert.alert('خطأ', 'الرجاء إدخال جميع الحقول');
      return;
    }
    Alert.alert('نجاح', 'تم تغيير كلمة المرور بنجاح', [
      { text: 'حسناً', onPress: () => router.back() }
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>كلمة المرور الحالية</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={oldPassword}
            onChangeText={setOldPassword}
            placeholder="********"
            textAlign="right"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>كلمة المرور الجديدة</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="********"
            textAlign="right"
          />
        </View>

        <Pressable style={styles.btn} onPress={handleSave}>
          <Text style={styles.btnText}>حفظ التغييرات</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing[4] },
  form: { backgroundColor: colors.surface, padding: spacing[4], borderRadius: radius.lg, gap: spacing[4], shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  inputGroup: { gap: spacing[2] },
  label: { fontSize: fontSizes.sm, fontFamily: fontFamily.bold, color: colors.textPrimary, textAlign: 'right' },
  input: { height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing[3], fontFamily: fontFamily.regular, color: colors.textPrimary },
  btn: { backgroundColor: colors.primary, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: spacing[2] },
  btnText: { color: '#fff', fontSize: fontSizes.base, fontFamily: fontFamily.bold },
});
