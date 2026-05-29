'use client';

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fontSizes, radius, spacing } from '../../src/theme';
import { useAuthStore } from '../../src/stores/auth.store';

const ITEMS = [
  { icon: '📍', label: 'عناويني المحفوظة' },
  { icon: '🔔', label: 'الإشعارات' },
  { icon: '🌐', label: 'اللغة' },
  { icon: '🔒', label: 'تغيير كلمة المرور' },
  { icon: '⭐', label: 'قيّم التطبيق' },
  { icon: '📞', label: 'تواصل معنا' },
  { icon: 'ℹ️', label: 'عن التطبيق' },
];

export default function Profile() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing[4] }}>
      <View style={styles.head}>
        <View style={styles.avatar}>
          <Text style={{ fontSize: 32 }}>👤</Text>
        </View>
        <Text style={styles.name}>{user?.name || 'مستكشف شو عبالك'}</Text>
        <Text style={styles.phone}>{user?.phone || 'جوال غير معرف'}</Text>
        <Pressable style={styles.editBtn}>
          <Text style={styles.editText}>تعديل الملف</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {ITEMS.map((it, i) => (
          <Pressable key={it.label} style={[styles.item, i < ITEMS.length - 1 && styles.itemBorder]}>
            <Text style={styles.itemIcon}>{it.icon}</Text>
            <Text style={styles.itemLabel}>{it.label}</Text>
            <Text style={styles.chevron}>‹</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.logout} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 تسجيل الخروج</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: spacing[2], marginBottom: spacing[6] },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: fontSizes.xl, fontWeight: '700', color: colors.textPrimary },
  phone: { color: colors.textMuted },
  editBtn: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing[6], paddingVertical: spacing[2], marginTop: spacing[2] },
  editText: { color: colors.primary, fontWeight: '600' },
  list: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  item: { flexDirection: 'row-reverse', alignItems: 'center', padding: spacing[4], gap: spacing[3] },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  itemIcon: { fontSize: 20 },
  itemLabel: { flex: 1, fontSize: fontSizes.base, color: colors.textPrimary, textAlign: 'right' },
  chevron: { fontSize: 24, color: colors.textMuted },
  logout: { marginTop: spacing[6], alignItems: 'center', padding: spacing[4] },
  logoutText: { color: colors.error, fontWeight: '700', fontSize: fontSizes.base },
});
