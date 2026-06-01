import { useRef } from 'react';
import { ActivityIndicator, Alert, TouchableOpacity, ScrollView, StyleSheet, Switch, Text, View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Phone, Bike, MapPin, LogOut } from 'lucide-react-native';
import { driversApi } from '@shu/api-client';
import { colors, fontSizes, fontFamily, radius, spacing } from '../../src/theme';
import { useAuthStore } from '../../src/stores/auth.store';

export default function DriverProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);
  const toggling = useRef(false);

  const { data: driver, isLoading } = useQuery({
    queryKey: ['driver-me'],
    queryFn: () => driversApi.me(),
  });

  const toggleAvailable = useMutation({
    mutationFn: (status: 'AVAILABLE' | 'OFFLINE') =>
      driversApi.updateMyStatus({ status, areaId: driver?.areaId }),
    onSuccess: () => {
      toggling.current = false;
      queryClient.invalidateQueries({ queryKey: ['driver-me'] });
    },
    onError: (err: any) => {
      toggling.current = false;
      const msg = err.response?.data?.message || 'فشل تحديث حالة التوفر.';
      Alert.alert('خطأ', msg);
    },
  });

  const handleToggle = (val: boolean) => {
    if (toggling.current || toggleAvailable.isPending) return;
    toggling.current = true;
    toggleAvailable.mutate(val ? 'AVAILABLE' : 'OFFLINE');
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        logout();
        queryClient.clear();
        router.replace('/(auth)/login');
      }
      return;
    }
    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد من تسجيل الخروج؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تسجيل الخروج',
          style: 'destructive',
          onPress: () => {
            logout();
            queryClient.clear();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isAvailable = driver?.status === 'AVAILABLE';
  const name = driver?.user?.name || '—';
  const phone = driver?.user?.phone || '—';
  const area = driver?.area ? `${driver.area.city} — ${driver.area.name}` : '—';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Orange header — no absolutely-positioned children so nothing overlaps scroll */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>الحساب الشخصي</Text>
        <View style={styles.avatar}>
          <User size={40} color={colors.primary} />
        </View>
        <Text style={styles.driverName}>{name}</Text>
      </View>

      <View style={styles.content}>
        {/* Availability toggle */}
        <View style={styles.card}>
          <View style={styles.availRow}>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <View style={styles.availLabelRow}>
                <Text style={[styles.availDot, { color: isAvailable ? colors.success : colors.error }]}>●</Text>
                <Text style={styles.availLabel}>{isAvailable ? 'متاح للعمل' : 'غير متاح'}</Text>
              </View>
              <Text style={styles.muted}>
                {isAvailable ? 'يمكنك استقبال الطلبات الآن' : 'لن تستقبل طلبات جديدة'}
              </Text>
            </View>
            <Switch
              value={isAvailable}
              onValueChange={handleToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
              disabled={toggleAvailable.isPending}
            />
          </View>
        </View>

        {/* Personal info */}
        <Text style={styles.sectionTitle}>المعلومات الشخصية</Text>
        <View style={styles.card}>
          <InfoRow icon={<User size={18} color={colors.primary} />} label="الاسم الكامل" value={name} />
          <View style={styles.divider} />
          <InfoRow icon={<Phone size={18} color={colors.primary} />} label="رقم الهاتف" value={phone} />
        </View>

        {/* Area */}
        <Text style={styles.sectionTitle}>منطقة العمل</Text>
        <View style={styles.card}>
          <InfoRow icon={<MapPin size={18} color={colors.primary} />} label="المنطقة المعيّنة" value={area} />
        </View>

        {/* Vehicle */}
        <Text style={styles.sectionTitle}>بيانات المركبة</Text>
        <View style={styles.card}>
          <InfoRow icon={<Bike size={18} color={colors.primary} />} label="نوع المركبة" value="دراجة نارية" />
        </View>

        {/* Logout — TouchableOpacity instead of Pressable so it works inside ScrollView */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoValue}>{value}</Text>
      <View style={styles.infoLabelRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        {icon}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    paddingBottom: 24,
    paddingHorizontal: spacing[5],
    alignItems: 'center',
    gap: spacing[3],
  },
  headerTitle: {
    fontFamily: fontFamily.extrabold,
    fontSize: fontSizes.xl,
    color: '#fff',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.lg,
    color: '#fff',
  },
  content: {
    paddingTop: spacing[4],
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    textAlign: 'right',
    marginTop: spacing[2],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
  availRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[3],
  },
  availLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  availDot: { fontSize: 14 },
  availLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
  },
  muted: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    textAlign: 'right',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing[3],
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  infoValue: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    marginTop: spacing[4],
    padding: spacing[4],
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radius.lg,
  },
  logoutText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.base,
    color: '#EF4444',
  },
});
