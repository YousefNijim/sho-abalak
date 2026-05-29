import { Pressable, ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  MapPin,
  Bell,
  Globe,
  Lock,
  Star,
  Phone,
  Info,
  ChevronLeft,
  LogOut,
  User,
} from 'lucide-react-native';
import { colors, fontSizes, fontFamily, radius, spacing, components } from '../../src/theme';
import { useAuthStore } from '../../src/stores/auth.store';

const ITEMS = [
  { Icon: MapPin,  label: 'عناويني المحفوظة',   route: '/profile/addresses' },
  { Icon: Bell,   label: 'الإشعارات',             route: '/profile/notifications' },
  { Icon: Globe,  label: 'اللغة',                 route: null },
  { Icon: Lock,   label: 'تغيير كلمة المرور',    route: '/profile/change-password' },
  { Icon: Star,   label: 'قيّم التطبيق',          route: null },
  { Icon: Phone,  label: 'تواصل معنا',             route: null },
  { Icon: Info,   label: 'عن التطبيق',             route: '/profile/about' },
];

export default function Profile() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد أنك تريد الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'خروج',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
    : '؟';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing[4], paddingBottom: spacing[12] }}
    >
      {/* Avatar + info */}
      <View style={styles.head}>
        <View style={styles.avatar}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.name || 'مستكشف شو عبالك'}</Text>
        <Text style={styles.phone}>{user?.phone || ''}</Text>
        <Pressable
          style={styles.editBtn}
          onPress={() =>
            Alert.alert('قريباً', 'تعديل الملف الشخصي سيكون متاحاً قريباً')
          }
        >
          <User size={14} color={colors.primary} />
          <Text style={styles.editText}>تعديل الملف</Text>
        </Pressable>
      </View>

      {/* Settings list */}
      <View style={styles.list}>
        {ITEMS.map(({ Icon, label, route }, i) => (
          <Pressable
            key={label}
            style={[styles.item, i < ITEMS.length - 1 && styles.itemBorder]}
            onPress={() => {
              if (route) {
                router.push(route as any);
              } else {
                Alert.alert('قريباً', `شاشة ${label} ستكون متاحة قريباً`);
              }
            }}
          >
            <View style={styles.iconWrap}>
              <Icon size={18} color={colors.secondary} />
            </View>
            <Text style={styles.itemLabel}>{label}</Text>
            <ChevronLeft size={18} color={colors.border} />
          </Pressable>
        ))}
      </View>

      {/* Logout */}
      <Pressable style={styles.logout} onPress={handleLogout}>
        <LogOut size={18} color={colors.error} />
        <Text style={styles.logoutText}>تسجيل الخروج</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: {
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[6],
    paddingTop: spacing[4],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '20',
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: fontSizes['2xl'],
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },
  name: {
    fontSize: fontSizes.xl,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    marginTop: spacing[2],
  },
  phone: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.base,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2],
    marginTop: spacing[2],
  },
  editText: {
    color: colors.primary,
    fontFamily: fontFamily.semibold,
    fontSize: fontSizes.sm,
  },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: spacing[4],
    gap: spacing[3],
    minHeight: components.touchTargetMin,
  },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.secondary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    flex: 1,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    textAlign: 'right',
    fontFamily: fontFamily.regular,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[6],
    padding: spacing[4],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.error + '40',
  },
  logoutText: {
    color: colors.error,
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.base,
  },
});
