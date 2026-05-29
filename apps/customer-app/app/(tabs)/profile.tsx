import { Pressable, ScrollView, StyleSheet, Text, View, Alert, Platform } from 'react-native';
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
  Edit2,
  Headset
} from 'lucide-react-native';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';
import { useAuthStore } from '../../src/stores/auth.store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

const GROUPS = [
  [
    { Icon: MapPin, label: 'عناويني المحفوظة', route: '/profile/addresses' },
    { Icon: Bell, label: 'التنبيهات', route: '/profile/notifications' },
    { Icon: Globe, label: 'اللغة', route: null, trailing: 'العربية' },
  ],
  [
    { Icon: Lock, label: 'تغيير كلمة المرور', route: '/profile/change-password' },
    { Icon: Star, label: 'تقييم التطبيق', route: null },
  ],
  [
    { Icon: Headset, label: 'اتصل بنا', route: null },
    { Icon: Info, label: 'من نحن', route: '/profile/about' },
  ]
];

export default function Profile() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('هل أنت متأكد أنك تريد الخروج؟')) {
        logout();
        router.replace('/(auth)/login');
      }
      return;
    }
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

  const navigateTo = (route: string | null, label: string) => {
    if (route) {
      router.push(route as any);
    } else {
      if (Platform.OS === 'web') {
        window.alert(`شاشة ${label} ستكون متاحة قريباً`);
      } else {
        Alert.alert('قريباً', `شاشة ${label} ستكون متاحة قريباً`);
      }
    }
  };

  const userImage = user?.imageUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUSZfCM-tLbRtzPFjdltok_AvJFIYQYCOPLdPX3NXaaHNm0KCEco5A-ZZNR_Z_lWA2hlTnpqeUjmJUmz65hX4mYw5FBHXmVbs7zsCBEyzilWML6gn7DafAdoxKKzkToFelHt5_G23OFo5r9CC3SElLF_KoaB8U_7ReJsfkoSALty4a9cQSkEzEtIUcNtJFue5y-Vbye8IUG7uCkCBstYJZoHAipmEhePvayLQBPhgO7I6GIaPTIlv2aKhaPfLJBREvaDwccwXANlib';
  const smallAvatar = user?.imageUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDa1He8yho8BE00MM1pAWfA2YsyLWRy6k5mUf7ByERqjZuFWFMfwd_qx2l9d5jtT6iiZcZ6cYH_zCy_nIQcUdnRrkqUy7Oz2T2sLARn4STyOZcoFBKewag5w9k3cmRJkn7PXHw4Jyo1nlX_VTtuHoTUINjt4JAHkcwzNOCA_I7_Th8Y4i__ZJCebT1ki_O_etwlQE1rXbaViSVVOh-SZ3uDnYXHu-u5o_DC3V9SlLrImoF_rlxAO9V3ZH-2JxetDLSvBvDx3h1LPSOY';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top : spacing[4] }]}>
        <Text style={styles.headerTitle}>شو عبالك؟</Text>
        <View style={styles.headerRight}>
          <Pressable style={styles.iconBtn}>
            <Bell size={24} color={colors.primary} />
          </Pressable>
          <View style={styles.avatarWrapSmall}>
            <Image
              source={{ uri: smallAvatar }}
              style={styles.avatarSmall}
              contentFit="cover"
            />
          </View>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing[12] }]} 
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrapLarge}>
              <Image
                source={{ uri: userImage }}
                style={styles.avatarLarge}
                contentFit="cover"
              />
            </View>
            <Pressable style={styles.editAvatarBtn}>
              <Edit2 size={14} color="#FFF" />
            </Pressable>
          </View>

          <Text style={styles.userName}>{user?.name || 'أحمد محمود'}</Text>
          <Text style={styles.userPhone} dir="ltr">{user?.phone || '+970 59-xxxx-xxx'}</Text>

          <Pressable 
            style={styles.editProfileBtn}
            onPress={() => navigateTo(null, 'تعديل الملف الشخصي')}
          >
            <User size={18} color="#FFF" />
            <Text style={styles.editProfileText}>تعديل الملف الشخصي</Text>
          </Pressable>
        </View>

        {/* Profile Menu Groups */}
        <View style={styles.menuGroups}>
          {GROUPS.map((group, gIdx) => (
            <View key={gIdx} style={styles.menuGroupCard}>
              {group.map((item, iIdx) => {
                const Icon = item.Icon;
                return (
                  <View key={item.label}>
                    <Pressable 
                      style={styles.menuItem}
                      onPress={() => navigateTo(item.route, item.label)}
                    >
                      <View style={styles.menuItemLeft}>
                        <Icon size={22} color={colors.primary} />
                        <Text style={styles.menuItemLabel}>{item.label}</Text>
                      </View>
                      
                      <View style={styles.menuItemRight}>
                        {item.trailing && (
                          <Text style={styles.menuItemTrailing}>{item.trailing}</Text>
                        )}
                        <ChevronLeft size={20} color={colors.textMuted} />
                      </View>
                    </Pressable>
                    {iIdx < group.length - 1 && <View style={styles.menuDivider} />}
                  </View>
                );
              })}
            </View>
          ))}

          {/* Logout */}
          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={20} color="#EF4444" />
            <Text style={styles.logoutText}>تسجيل الخروج</Text>
          </Pressable>
        </View>

        {/* Version Info */}
        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>الإصدار 2.4.0 (2024)</Text>
          <Text style={styles.versionText}>صنع بكل حب في فلسطين 🇵🇸</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCF3DC', // background-cream
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    height: 64 + (Platform.OS === 'ios' ? 44 : 0),
    backgroundColor: '#FCF3DC',
    zIndex: 40,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
      android: { elevation: 2 },
      web: { boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    }),
  },
  headerTitle: {
    fontFamily: fontFamily.semibold, // headline-sm
    fontSize: 20,
    color: colors.primary,
  },
  headerRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing[3],
  },
  iconBtn: {
    padding: spacing[1],
  },
  avatarWrapSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarSmall: {
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing[6],
    alignItems: 'center',
    marginBottom: spacing[6],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing[4],
  },
  avatarWrapLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: '#ffdbc7', // primary-fixed
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  avatarLarge: {
    width: '100%',
    height: '100%',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  userName: {
    fontFamily: fontFamily.bold, // headline-md
    fontSize: 24,
    color: colors.textPrimary,
    marginBottom: spacing[1],
  },
  userPhone: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: spacing[6],
  },
  editProfileBtn: {
    width: '100%',
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  editProfileText: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: '#FFF',
  },
  menuGroups: {
    gap: spacing[4],
  },
  menuGroupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  menuItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    backgroundColor: '#FFFFFF',
  },
  menuItemLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing[3],
  },
  menuItemLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 17, // body-lg
    color: colors.textPrimary,
  },
  menuItemRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing[2],
  },
  menuItemTrailing: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.primary,
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(229, 224, 213, 1)', // border-beige
  },
  logoutBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing[3],
    padding: spacing[4],
    backgroundColor: 'rgba(255, 218, 214, 0.2)', // error-container/20
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.1)', // error/10
    borderRadius: radius.xl,
  },
  logoutText: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: '#EF4444',
  },
  versionInfo: {
    marginTop: spacing[8],
    alignItems: 'center',
    gap: spacing[1],
  },
  versionText: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
});
