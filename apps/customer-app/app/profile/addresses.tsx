import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Home as HomeIcon,
  Check,
  ChevronDown,
} from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, fontSizes, fontFamily, spacing, radius } from '../../src/theme';
import { addressesApi, areasApi } from '@shu/api-client';
import type { SavedAddress, CreateAddressDtoClient } from '@shu/api-client';
import { useSavedAddressesStore } from '../../src/stores/saved-addresses.store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type FormState = { label: string; detail: string; areaId: string };
const EMPTY_FORM: FormState = { label: '', detail: '', areaId: '' };

export default function AddressesScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();

  // Zustand store — keep in sync so Home/Cart picker reflects API state
  const storeAdd = useSavedAddressesStore((s) => s.add);
  const storeRemove = useSavedAddressesStore((s) => s.remove);
  const storeAddresses = useSavedAddressesStore((s) => s.addresses);

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [areaPicker, setAreaPicker] = useState(false);

  // ── data ───────────────────────────────────────────────────────────
  const { data: addresses = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressesApi.list(),
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: () => areasApi.list(),
  });

  // ── mutations ──────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: (dto: CreateAddressDtoClient) => addressesApi.create(dto),
    onSuccess: (newAddr) => {
      qc.invalidateQueries({ queryKey: ['addresses'] });
      // Sync Zustand store so picker sees it immediately
      storeAdd({ label: newAddr.label, detail: newAddr.detail, areaId: newAddr.areaId ?? null });
      closeModal();
    },
    onError: () => Alert.alert('خطأ', 'فشل حفظ العنوان. يرجى المحاولة لاحقاً.'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateAddressDtoClient> }) =>
      addressesApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addresses'] });
      closeModal();
    },
    onError: () => Alert.alert('خطأ', 'فشل تحديث العنوان. يرجى المحاولة لاحقاً.'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => addressesApi.remove(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['addresses'] });
      // Remove from Zustand store by matching label (store uses its own ids)
      const storeEntry = storeAddresses.find(
        (a) => a.label === addresses.find((ad) => ad.id === id)?.label,
      );
      if (storeEntry) storeRemove(storeEntry.id);
    },
    onError: () => Alert.alert('خطأ', 'فشل حذف العنوان.'),
  });

  // ── helpers ────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = (addr: SavedAddress) => {
    setEditing(addr);
    setForm({ label: addr.label, detail: addr.detail, areaId: addr.areaId ?? '' });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = () => {
    if (!form.label.trim()) {
      Alert.alert('تنبيه', 'الرجاء إدخال اسم / تسمية للعنوان');
      return;
    }
    if (!form.detail.trim()) {
      Alert.alert('تنبيه', 'الرجاء إدخال تفاصيل العنوان');
      return;
    }
    const dto: CreateAddressDtoClient = {
      label: form.label.trim(),
      detail: form.detail.trim(),
      areaId: form.areaId || undefined,
    };
    if (editing) {
      updateMut.mutate({ id: editing.id, dto });
    } else {
      createMut.mutate(dto);
    }
  };

  const handleDelete = (addr: SavedAddress) => {
    Alert.alert(
      'حذف العنوان',
      'هل أنت متأكد من حذف هذا العنوان؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => deleteMut.mutate(addr.id),
        },
      ],
    );
  };

  const selectedArea = areas.find((a) => a.id === form.areaId);
  const isPending = createMut.isPending || updateMut.isPending;

  // ── render ─────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top : 0 }]}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <ArrowRight size={24} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>عناويني المحفوظة</Text>
        </View>
      </View>

      {/* Body */}
      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centerState}>
          <MapPin size={48} color={colors.border} />
          <Text style={styles.emptyTitle}>تعذّر تحميل العناوين</Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      ) : addresses.length === 0 ? (
        <View style={styles.centerState}>
          <MapPin size={56} color={colors.border} />
          <Text style={styles.emptyTitle}>لا توجد عناوين محفوظة</Text>
          <Text style={styles.emptyHint}>أضف عنواناً لتسريع عملية الطلب</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: 100 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {addresses.map((addr) => (
            <View key={addr.id} style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={styles.cardIconCircle}>
                  <HomeIcon size={20} color={colors.primary} />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardLabel}>{addr.label}</Text>
                  <Text style={styles.cardDetail} numberOfLines={2}>{addr.detail}</Text>
                  {addr.area && (
                    <View style={styles.areaTag}>
                      <MapPin size={11} color={colors.textMuted} />
                      <Text style={styles.areaTagText}>{addr.area.city} — {addr.area.name}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.cardActions}>
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => openEdit(addr)}
                  disabled={deleteMut.isPending}
                >
                  <Pencil size={18} color={colors.primary} />
                </Pressable>
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => handleDelete(addr)}
                  disabled={deleteMut.isPending}
                >
                  {deleteMut.isPending && deleteMut.variables === addr.id ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <Trash2 size={18} color={colors.error} />
                  )}
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing[4] }]}>
        <Pressable style={styles.addBtn} onPress={openAdd}>
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.addBtnText}>إضافة عنوان جديد</Text>
        </Pressable>
      </View>

      {/* Add / Edit modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal} />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing[4] }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>
            {editing ? 'تعديل العنوان' : 'إضافة عنوان جديد'}
          </Text>

          {/* Label */}
          <Text style={styles.fieldLabel}>التسمية *</Text>
          <TextInput
            style={styles.input}
            placeholder="مثلاً: المنزل، العمل، بيت العائلة..."
            placeholderTextColor={colors.textMuted}
            value={form.label}
            onChangeText={(v) => setForm((f) => ({ ...f, label: v }))}
            textAlign="right"
            returnKeyType="next"
          />

          {/* Detail */}
          <Text style={styles.fieldLabel}>تفاصيل العنوان *</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="الشارع، المبنى، الطابق..."
            placeholderTextColor={colors.textMuted}
            value={form.detail}
            onChangeText={(v) => setForm((f) => ({ ...f, detail: v }))}
            textAlign="right"
            multiline
            textAlignVertical="top"
          />

          {/* Area picker */}
          <Text style={styles.fieldLabel}>المنطقة / منطقة التوصيل</Text>
          <Pressable style={styles.selectRow} onPress={() => setAreaPicker(true)}>
            <ChevronDown size={16} color={colors.textMuted} />
            <Text style={[styles.selectText, !selectedArea && styles.selectPlaceholder]}>
              {selectedArea ? `${selectedArea.city} — ${selectedArea.name}` : 'اختر المنطقة (اختياري)'}
            </Text>
            <MapPin size={16} color={colors.textMuted} />
          </Pressable>

          {/* Submit */}
          <Pressable
            style={[styles.submitBtn, isPending && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {editing ? 'حفظ التعديلات' : 'إضافة العنوان'}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Nested area picker modal */}
        <Modal
          visible={areaPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setAreaPicker(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setAreaPicker(false)} />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing[4] }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>اختر المنطقة</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Clear option */}
              <Pressable
                style={[styles.areaRow, !form.areaId && styles.areaRowActive]}
                onPress={() => { setForm((f) => ({ ...f, areaId: '' })); setAreaPicker(false); }}
              >
                <View style={[styles.areaIconCircle, !form.areaId && styles.areaIconCircleActive]}>
                  <MapPin size={16} color={!form.areaId ? colors.primary : colors.textMuted} />
                </View>
                <Text style={[styles.areaRowText, !form.areaId && styles.areaRowTextActive]}>
                  بدون تحديد منطقة
                </Text>
                {!form.areaId && <Check size={16} color={colors.primary} />}
              </Pressable>
              {areas.map((a) => {
                const active = form.areaId === a.id;
                return (
                  <Pressable
                    key={a.id}
                    style={[styles.areaRow, active && styles.areaRowActive]}
                    onPress={() => { setForm((f) => ({ ...f, areaId: a.id })); setAreaPicker(false); }}
                  >
                    <View style={[styles.areaIconCircle, active && styles.areaIconCircleActive]}>
                      <MapPin size={16} color={active ? colors.primary : colors.textMuted} />
                    </View>
                    <Text style={[styles.areaRowText, active && styles.areaRowTextActive]}>
                      {a.city} — {a.name}
                    </Text>
                    {active && <Check size={16} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Modal>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing[4],
    height: 64,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing[2],
  },
  iconBtn: { padding: spacing[1] },
  headerTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSizes.xl,
    color: colors.primary,
  },

  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    padding: spacing[6],
  },
  emptyTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[2],
    backgroundColor: colors.primary + '20',
    borderRadius: radius.md,
  },
  retryText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.sm,
    color: colors.primary,
  },

  list: {
    padding: spacing[4],
    gap: spacing[4],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: spacing[3],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    }),
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row-reverse',
    gap: spacing[3],
    alignItems: 'flex-start',
  },
  cardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, alignItems: 'flex-end' },
  cardLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: 2,
  },
  cardDetail: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'right',
    lineHeight: 20,
  },
  areaTag: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing[1],
  },
  areaTagText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  cardActions: {
    flexDirection: 'row-reverse',
    gap: spacing[1],
    alignItems: 'center',
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 8 },
      web: { boxShadow: '0 -2px 8px rgba(0,0,0,0.05)' },
    }),
  },
  addBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 52,
  },
  addBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.base,
    color: '#FFFFFF',
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing[4],
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary + '40',
    alignSelf: 'center',
    marginBottom: spacing[4],
  },
  modalTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.xl,
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: spacing[4],
  },
  fieldLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: spacing[1],
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    marginBottom: spacing[4],
  },
  inputMulti: {
    height: 80,
    textAlignVertical: 'top',
  },
  selectRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  selectText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  selectPlaceholder: { color: colors.textMuted },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.base,
    color: '#FFFFFF',
  },

  // Area rows inside nested picker
  areaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderRadius: radius.md,
    marginBottom: spacing[1],
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  areaRowActive: {
    backgroundColor: colors.primary + '0D',
    borderColor: colors.primary + '40',
  },
  areaIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.border + '80',
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaIconCircleActive: { backgroundColor: colors.primary + '20' },
  areaRowText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  areaRowTextActive: {
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },
});
