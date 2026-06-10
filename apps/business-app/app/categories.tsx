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
import { ArrowRight, Plus, Trash2, ChevronUp, ChevronDown, Check, X } from 'lucide-react-native';
import { businessesApi, categoriesApi } from '@shu/api-client';
import type { ProductCategory } from '@shu/api-client';
import { colors, fontFamily, fontSizes, radius, spacing } from '../src/theme';

export default function CategoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: business } = useQuery({
    queryKey: ['business-mine'],
    queryFn: () => businessesApi.mine(),
  });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['my-categories', business?.id],
    queryFn: () => categoriesApi.listByBusiness(business!.id),
    enabled: !!business,
  });

  const createCategory = useMutation({
    mutationFn: (name: string) => categoriesApi.create({ businessId: business!.id, name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-categories'] });
      setNewName('');
      setShowAddForm(false);
    },
    onError: (err: any) => Alert.alert('خطأ', err.response?.data?.message ?? 'فشل إضافة التصنيف'),
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => categoriesApi.update(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-categories'] });
      setEditingId(null);
      setEditName('');
    },
    onError: (err: any) => Alert.alert('خطأ', err.response?.data?.message ?? 'فشل تعديل التصنيف'),
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-categories'] }),
    onError: (err: any) => Alert.alert('خطأ', err.response?.data?.message ?? 'فشل حذف التصنيف'),
  });

  const reorderCategory = useMutation({
    mutationFn: ({ idx, direction }: { idx: number; direction: 'up' | 'down' }) => {
      const arr = [...(categories as ProductCategory[])];
      const swapWith = direction === 'up' ? idx - 1 : idx + 1;
      [arr[idx], arr[swapWith]] = [arr[swapWith], arr[idx]];
      return categoriesApi.reorder(arr.map((c) => c.id));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-categories'] }),
    onError: (err: any) => Alert.alert('خطأ', err.response?.data?.message ?? 'فشل إعادة الترتيب'),
  });

  const handleCreate = () => {
    if (!newName.trim()) { Alert.alert('تنبيه', 'اسم التصنيف مطلوب'); return; }
    createCategory.mutate(newName.trim());
  };

  const handleUpdate = () => {
    if (!editingId) return;
    if (!editName.trim()) { Alert.alert('تنبيه', 'اسم التصنيف مطلوب'); return; }
    updateCategory.mutate({ id: editingId, name: editName.trim() });
  };

  const handleDelete = (cat: ProductCategory) => {
    Alert.alert('حذف التصنيف', `حذف "${cat.name}"؟ سيُزال التصنيف من جميع المنتجات المرتبطة.`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deleteCategory.mutate(cat.id) },
    ]);
  };

  const cats = categories as ProductCategory[];

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
        <Text style={styles.headerTitle}>تصنيفات المنتجات</Text>
        <Pressable style={styles.addIconBtn} onPress={() => setShowAddForm((v) => !v)} hitSlop={8}>
          {showAddForm ? <X size={20} color={colors.textMuted} /> : <Plus size={20} color={colors.primary} />}
        </Pressable>
      </View>

      {/* Add form */}
      {showAddForm && (
        <View style={styles.addForm}>
          <View style={styles.addRow}>
            <Pressable
              style={[styles.addBtn, createCategory.isPending && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={createCategory.isPending}
            >
              {createCategory.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.addBtnText}>إضافة</Text>}
            </Pressable>
            <TextInput
              style={[styles.addInput, { flex: 1 }]}
              value={newName}
              onChangeText={setNewName}
              placeholder="اسم التصنيف الجديد"
              placeholderTextColor={colors.textMuted}
              textAlign="right"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
          </View>
        </View>
      )}

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
          {cats.map((cat, idx) => (
            <View key={cat.id} style={styles.catRow}>
              {/* Reorder buttons */}
              <View style={styles.reorderBtns}>
                <Pressable
                  hitSlop={6}
                  style={[styles.reorderBtn, idx === 0 && styles.reorderBtnDisabled]}
                  onPress={() => idx > 0 && reorderCategory.mutate({ idx, direction: 'up' })}
                  disabled={idx === 0 || reorderCategory.isPending}
                >
                  <ChevronUp size={16} color={idx === 0 ? colors.border : colors.textMuted} />
                </Pressable>
                <Pressable
                  hitSlop={6}
                  style={[styles.reorderBtn, idx === cats.length - 1 && styles.reorderBtnDisabled]}
                  onPress={() => idx < cats.length - 1 && reorderCategory.mutate({ idx, direction: 'down' })}
                  disabled={idx === cats.length - 1 || reorderCategory.isPending}
                >
                  <ChevronDown size={16} color={idx === cats.length - 1 ? colors.border : colors.textMuted} />
                </Pressable>
              </View>

              {/* Name (edit inline) */}
              <View style={styles.catInfo}>
                {editingId === cat.id ? (
                  <View style={styles.editRow}>
                    <Pressable
                      hitSlop={8}
                      onPress={() => { setEditingId(null); setEditName(''); }}
                    >
                      <X size={18} color={colors.textMuted} />
                    </Pressable>
                    <Pressable
                      hitSlop={8}
                      style={[styles.saveEditBtn, updateCategory.isPending && { opacity: 0.6 }]}
                      onPress={handleUpdate}
                      disabled={updateCategory.isPending}
                    >
                      {updateCategory.isPending
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Check size={16} color="#fff" />}
                    </Pressable>
                    <TextInput
                      style={styles.editInput}
                      value={editName}
                      onChangeText={setEditName}
                      textAlign="right"
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={handleUpdate}
                    />
                  </View>
                ) : (
                  <Pressable
                    onPress={() => { setEditingId(cat.id); setEditName(cat.name); }}
                  >
                    <Text style={styles.catName}>{cat.name}</Text>
                  </Pressable>
                )}
              </View>

              {/* Delete */}
              <Pressable
                hitSlop={8}
                onPress={() => handleDelete(cat)}
                disabled={deleteCategory.isPending}
              >
                <Trash2 size={18} color={colors.textMuted} />
              </Pressable>
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
  editRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  editInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: Platform.OS === 'ios' ? spacing[2] : spacing[1],
    fontSize: fontSizes.base,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  saveEditBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
