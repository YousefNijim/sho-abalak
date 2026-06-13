import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowRight, Lock } from 'lucide-react-native';
import { businessesApi, businessCategoriesApi } from '@shu/api-client';
import type { CategoryTemplate } from '@shu/api-client';
import { colors, fontFamily, fontSizes, radius, spacing } from '../src/theme';

export default function CategoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data: business } = useQuery({
    queryKey: ['business-mine'],
    queryFn: () => businessesApi.mine(),
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['my-templates', business?.id],
    queryFn: () => businessCategoriesApi.getMyTemplates(),
    enabled: !!business && business.type === 'STORE',
  });

  const toggleTemplate = useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
      businessCategoriesApi.toggle(id, isEnabled),
    onMutate: (vars) => setUpdatingId(vars.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-templates'] });
    },
    onError: (err: any) => Alert.alert('خطأ', err.response?.data?.message ?? 'فشل تحديث التصنيف'),
    onSettled: () => setUpdatingId(null),
  });

  const handleToggle = (id: string, isEnabled: boolean) => {
    toggleTemplate.mutate({ id, isEnabled });
  };

  const cats = templates as CategoryTemplate[];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[4] }]}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
          <ArrowRight size={22} color={colors.secondary} />
        </Pressable>
        <Text style={styles.headerTitle}>إدارة التصنيفات</Text>
        <View style={styles.addIconBtn} />
      </View>

      <View style={{ padding: spacing[4], backgroundColor: colors.surfaceContainerLow }}>
        <View style={{ flexDirection: 'row', gap: spacing[2], alignItems: 'flex-start' }}>
          <Lock size={16} color={colors.textMuted} style={{ marginTop: 2 }} />
          <Text style={{ flex: 1, fontFamily: fontFamily.regular, fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'right', lineHeight: 20 }}>
            التصنيفات تُدار من قِبَل الإدارة. يمكنك تفعيل أو إيقاف التصنيفات لتظهر في متجرك.
          </Text>
        </View>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : cats.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🗂️</Text>
          <Text style={styles.emptyText}>لا يوجد تصنيفات</Text>
          <Text style={styles.emptyDesc}>أضف تصنيفاً لتنظيم منتجاتك</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing[4], gap: spacing[3], paddingBottom: insets.bottom + spacing[8] }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {cats.map((cat) => (
            <View key={cat.id} style={{ overflow: 'hidden', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border }}>
              <View style={[styles.catRow, { borderWidth: 0, borderRadius: 0, borderBottomWidth: cat.children && cat.children.length > 0 ? 1 : 0 }]}>
                <View style={styles.catInfo}>
                  <Text style={styles.catName}>{cat.name}</Text>
                </View>
                {updatingId === cat.id ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <View style={styles.toggleWrap}>
                    <Text style={[styles.toggleText, cat.isEnabled !== false && { color: colors.primary }]}>{cat.isEnabled !== false ? 'مفعل' : 'معطل'}</Text>
                    <Switch
                      value={cat.isEnabled !== false}
                      onValueChange={(val) => handleToggle(cat.id, val)}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  </View>
                )}
              </View>
              {cat.children && cat.children.length > 0 && (
                <View style={{ backgroundColor: colors.surfaceContainerLow }}>
                  {cat.children.map((sub) => (
                    <View key={sub.id} style={[styles.catRow, { borderWidth: 0, borderRadius: 0, backgroundColor: 'transparent', paddingRight: spacing[8] }]}>
                      <View style={styles.catInfo}>
                        <Text style={[styles.catName, { fontSize: fontSizes.sm, color: colors.textMuted }]}>↳ {sub.name}</Text>
                      </View>
                      {updatingId === sub.id ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <View style={styles.toggleWrap}>
                          <Switch
                            value={sub.isEnabled !== false}
                            onValueChange={(val) => handleToggle(sub.id, val)}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor="#fff"
                            style={{ transform: [{ scale: 0.8 }] }}
                          />
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSizes.xl, fontFamily: fontFamily.bold, color: colors.secondary },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  addIconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  addForm: {
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  addRow: { flexDirection: 'row', gap: spacing[3], alignItems: 'center' },
  addInput: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    fontSize: fontSizes.base,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addBtnText: { fontFamily: fontFamily.bold, fontSize: fontSizes.base, color: '#fff' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[8], gap: spacing[2] },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: fontSizes.xl, fontFamily: fontFamily.bold, color: colors.textPrimary },
  emptyDesc: { fontSize: fontSizes.base, fontFamily: fontFamily.regular, color: colors.textMuted, textAlign: 'center' },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  reorderBtns: { flexDirection: 'column', gap: 2 },
  reorderBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.border + '40',
  },
  reorderBtnDisabled: { opacity: 0.3 },
  catInfo: { flex: 1 },
  catName: {
    fontSize: fontSizes.base,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  toggleWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  toggleText: { fontSize: fontSizes.xs, fontFamily: fontFamily.bold, color: colors.textMuted },
});
