'use client';

import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, fontSizes, radius, spacing } from '../../src/theme';
import { businessesApi, productsApi } from '@shu/api-client';

export default function Menu() {
  const queryClient = useQueryClient();

  // Fetch business profile owned by the logged-in user
  const { data: business } = useQuery({
    queryKey: ['business-mine'],
    queryFn: () => businessesApi.mine(),
  });

  // Fetch all products of this business
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['my-products', business?.id],
    queryFn: () => productsApi.listByBusiness(business!.id),
    enabled: !!business,
  });

  // Mutation to toggle availability
  const toggleAvailable = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      productsApi.update(id, { isAvailable }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-products'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'فشل تحديث حالة المنتج.';
      Alert.alert('خطأ', msg);
    },
  });

  // Mutation to delete a product
  const deleteProduct = useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-products'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'فشل حذف المنتج.';
      Alert.alert('خطأ', msg);
    },
  });

  // Mutation to create a product
  const createProduct = useMutation({
    mutationFn: (dto: any) => productsApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-products'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'فشل إضافة المنتج.';
      Alert.alert('خطأ', msg);
    },
  });

  const handleToggle = (id: string, currentVal: boolean) => {
    toggleAvailable.mutate({ id, isAvailable: !currentVal });
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'تأكيد الحذف',
      `هل أنت متأكد من حذف المنتج "${name}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حذف', style: 'destructive', onPress: () => deleteProduct.mutate(id) },
      ],
    );
  };

  const handleAddProduct = () => {
    if (!business) return;
    Alert.alert(
      'إضافة منتج جديد',
      'هل تريد إضافة منتج تجريبي "شاورما دجاج سوبر" بسعر 22 ₪؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'إضافة',
          onPress: () => {
            createProduct.mutate({
              businessId: business.id,
              name: 'شاورما دجاج سوبر',
              description: 'خبز صاج كبير، صوص ثوم، مخلل، وبطاطا مقرمشة',
              price: 22,
              category: 'وجبات',
              isAvailable: true,
            });
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.head}>
        <Pressable style={styles.addBtn} onPress={handleAddProduct}>
          <Text style={styles.addText}>+ إضافة</Text>
        </Pressable>
        <Text style={styles.title}>قائمتي</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[3] }}>
        {products.length === 0 ? (
          <Text style={styles.empty}>لا توجد منتجات في قائمتك حالياً. اضغط "+ إضافة" لإضافة منتجك الأول!</Text>
        ) : (
          products.map((it: any) => (
            <View key={it.id} style={styles.item}>
              <View style={styles.img}><Text style={{ fontSize: 28 }}>🍽️</Text></View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.name}>{it.name}</Text>
                <Text style={styles.muted}>{it.category || 'عام'}</Text>
                <Text style={styles.price}>{it.price} ₪</Text>
              </View>
              <View style={{ alignItems: 'flex-start', gap: spacing[2] }}>
                <Switch
                  value={it.isAvailable}
                  onValueChange={() => handleToggle(it.id, it.isAvailable)}
                  trackColor={{ true: colors.primary }}
                  disabled={toggleAvailable.isPending}
                />
                <View style={styles.actions}>
                  <Pressable onPress={() => handleDelete(it.id, it.name)}>
                    <Text style={styles.actionIcon}>🗑️</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: spacing[4] },
  title: { fontSize: fontSizes.xl, fontWeight: '700', color: colors.textPrimary },
  addBtn: { backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  addText: { color: '#fff', fontWeight: '700' },
  item: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing[3], backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[3], borderWidth: 1, borderColor: colors.border },
  img: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: fontSizes.base, fontWeight: '700', color: colors.textPrimary },
  muted: { color: colors.textMuted, fontSize: fontSizes.sm },
  price: { color: colors.primary, fontWeight: '700', marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing[3], paddingLeft: 4 },
  actionIcon: { fontSize: 18 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing[12] },
});
