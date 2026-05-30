import { useRef } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LogOut, User, Phone, Bike, MapPin } from 'lucide-react-native';
import { Button } from '@shu/ui-components/native';
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
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تسجيل الخروج',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Toggle overlay while status update is in flight */}
      <Modal visible={toggleAvailable.isPending} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.overlayText}>جاري التحديث...</Text>
          </View>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Orange header banner */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>الحساب الشخصي</Text>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <User size={40} color={colors.primary} />
            </View>
          </View>
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

          {/* Logout */}
          <View style={styles.logoutWrap}>
            <Button
              title="تسجيل الخروج"
              variant="danger"
              onPress={handleLogout}
            />
          </View>
        </View>
      </ScrollView>
    </View>
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
    paddingBottom: 56,
    paddingHorizontal: spacing[5],
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.extrabold,
    fontSize: fontSizes.xl,
    color: '#fff',
    marginBottom: 16,
  },
  avatarWrap: {
    position: 'absolute',
    bottom: -40,
    alignSelf: 'center',
    zIndex: 10,
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
  content: {
    paddingTop: 56,
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
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[3],
  },
  availLabelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  availDot: {
    fontSize: 14,
  },
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
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabelRow: {
    flexDirection: 'row-reverse',
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
  logoutWrap: {
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[3],
    minWidth: 180,
  },
  overlayText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
  },
});
