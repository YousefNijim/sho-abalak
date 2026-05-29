'use client';

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@shu/ui-components/native';
import { colors, fontSizes, radius, spacing } from '../src/theme';
import { businessesApi, driversApi, ordersApi } from '@shu/api-client';

export default function DriverSelection() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const [filter, setFilter] = useState<'mine' | 'all'>('mine');

  // Fetch business details to get their area ID
  const { data: business } = useQuery({
    queryKey: ['business-mine'],
    queryFn: () => businessesApi.mine(),
  });

  const areaId = business?.areaId;

  // Fetch available drivers (scoped to areaId or all)
  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['available-drivers', filter, areaId],
    queryFn: () => driversApi.available(filter === 'mine' ? areaId : undefined),
    enabled: !!business,
  });

  // Assign driver mutation - READY -> PICKED_UP transition
  const assignDriver = useMutation({
    mutationFn: (driverId: string) =>
      ordersApi.updateStatus(orderId!, {
        status: 'PICKED_UP',
        driverId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['business-orders'] });
      router.replace(`/order/${orderId}`);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'فشل تعيين السائق للطلب.';
      Alert.alert('خطأ', msg);
    },
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.filters}>
        {[
          { key: 'mine', label: 'منطقتي فقط' },
          { key: 'all', label: 'الكل المتاحين' },
        ].map((f) => (
          <Pressable
            key={f.key}
            style={[styles.filter, filter === f.key && styles.filterActive]}
            onPress={() => setFilter(f.key as 'mine' | 'all')}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[3] }}>
        {drivers.length === 0 ? (
          <Text style={styles.empty}>لا يوجد سائقون متاحون حالياً في هذه المنطقة</Text>
        ) : (
          drivers.map((d: any) => (
            <View key={d.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.avatar}><Text style={{ fontSize: 24 }}>🛵</Text></View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={styles.name}>{d.user?.name || 'سائق منصة شو عبالك'}</Text>
                  <Text style={styles.muted}>{d.area?.city} - {d.area?.name}</Text>
                  <Text style={styles.muted}>⭐ {d.rating ? d.rating.toFixed(1) : '5.0'}</Text>
                </View>
                <View style={styles.availTag}><Text style={styles.availText}>نشط</Text></View>
              </View>
              <Button
                title={assignDriver.isPending ? 'جاري التعيين...' : 'إرسال الطلب للسائق'}
                onPress={() => assignDriver.mutate(d.id)}
                disabled={assignDriver.isPending}
                style={{ marginTop: spacing[3] }}
              />
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row-reverse', gap: spacing[2], padding: spacing[4] },
  filter: { flex: 1, paddingVertical: spacing[3], borderRadius: radius.md, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.textMuted, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing[3] },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: fontSizes.base, fontWeight: '700', color: colors.textPrimary },
  muted: { color: colors.textMuted, fontSize: fontSizes.sm },
  availTag: { backgroundColor: '#DCFCE7', borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: 4 },
  availText: { color: '#166534', fontWeight: '700', fontSize: fontSizes.sm },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing[12] },
});
