import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, Camera, X } from 'lucide-react-native';
import { businessesApi, productsApi } from '@shu/api-client';
import type { Product } from '@shu/api-client';
import { colors, fontFamily, fontSizes, radius, spacing } from '../../src/theme';
import { uploadImage, imageUrl } from '../../src/lib/upload';

// ─── Category colours ──────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  'وجبات رئيسية': '#E6781E',
  'مشروبات': '#165A34',
  'مقبلات': '#7C3AED',
  'حلويات': '#DB2777',
};

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? colors.primary;
}

// ─── Product Form State ─────────────────────────────────────────────────────────
interface ProductForm {
  name: string;
  description: string;
  price: string;
  category: string;
  isAvailable: boolean;
  imageUri: string | null;   // local picker URI
  imageUrl: string | null;   // already-uploaded server URL
}

const emptyForm = (): ProductForm => ({
  name: '',
  description: '',
  price: '',
  category: 'وجبات رئيسية',
  isAvailable: true,
  imageUri: null,
  imageUrl: null,
});

function formFromProduct(p: Product): ProductForm {
  return {
    name: p.name,
    description: p.description ?? '',
    price: String(p.price),
    category: p.category ?? 'وجبات رئيسية',
    isAvailable: p.isAvailable,
    imageUri: null,
    imageUrl: p.imageUrl ?? null,
  };
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function MenuTab() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm());
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Data fetching ─────────────────────────────────────────────────────────────
  const { data: business } = useQuery({
    queryKey: ['business-mine'],
    queryFn: () => businessesApi.mine(),
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['my-products', business?.id],
    queryFn: () => productsApi.listByBusiness(business!.id),
    enabled: !!business,
  });

  // Compute unique categories from products
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p: Product) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [products]);

  const filtered = useMemo(() => {
    if (!activeCategory) return products;
    return products.filter((p: Product) => p.category === activeCategory);
  }, [products, activeCategory]);

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const createProduct = useMutation({
    mutationFn: (dto: any) => productsApi.create(dto),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-products'] }); closeModal(); },
    onError: (err: any) => { Alert.alert('خطأ', err.response?.data?.message ?? 'فشل إضافة المنتج'); },
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) => productsApi.update(id, dto),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-products'] }); closeModal(); },
    onError: (err: any) => { Alert.alert('خطأ', err.response?.data?.message ?? 'فشل تعديل المنتج'); },
  });

  const toggleAvailable = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      productsApi.update(id, { isAvailable }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-products'] }); },
    onError: (err: any) => { Alert.alert('خطأ', err.response?.data?.message ?? 'فشل التحديث'); },
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-products'] }); },
    onError: (err: any) => { Alert.alert('خطأ', err.response?.data?.message ?? 'فشل حذف المنتج'); },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm());
    setModalVisible(true);
  };

  const openEditModal = (product: Product) => {
    setEditingId(product.id);
    setForm(formFromProduct(product));
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('تحتاج إذن الوصول للمعرض');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) {
      setForm((f) => ({ ...f, imageUri: res.assets[0].uri, imageUrl: null }));
    }
  };

  const handleSaveProduct = async () => {
    if (!business) return;
    if (!form.name.trim()) { Alert.alert('تنبيه', 'اسم المنتج مطلوب'); return; }
    const priceNum = parseFloat(form.price);
    if (isNaN(priceNum) || priceNum <= 0) { Alert.alert('تنبيه', 'السعر يجب أن يكون رقماً صحيحاً'); return; }

    let finalImageUrl: string | null = form.imageUrl;
    if (form.imageUri) {
      try {
        setUploading(true);
        finalImageUrl = await uploadImage(form.imageUri);
      } catch {
        Alert.alert('خطأ', 'فشل رفع الصورة');
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }

    const dto = {
      businessId: business.id,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: priceNum,
      category: form.category.trim() || undefined,
      isAvailable: form.isAvailable,
      imageUrl: finalImageUrl ?? undefined,
    };

    if (editingId) {
      updateProduct.mutate({ id: editingId, dto });
    } else {
      createProduct.mutate(dto);
    }
  };

  const handleDelete = (product: Product) => {
    Alert.alert('تأكيد الحذف', `حذف "${product.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deleteProduct.mutate(product.id) },
    ]);
  };

  const isSaving = createProduct.isPending || updateProduct.isPending || uploading;

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['my-products'] });
    setRefreshing(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  const activeCategoryLabel = activeCategory
    ? `إدارة ${activeCategory}`
    : 'إدارة قائمة الطعام';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[4] }]}>
        <Pressable style={styles.addBtn} onPress={openAddModal}>
          <Plus size={18} color="#fff" />
          <Text style={styles.addBtnText}>إضافة صنف</Text>
        </Pressable>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.headerTitle}>{activeCategoryLabel}</Text>
          <Text style={styles.headerSub}>عرض وتعديل قائمتك الخاصة بك</Text>
        </View>
      </View>

      {/* Category Tabs */}
      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
          style={styles.tabsScroll}
        >
          <Pressable
            style={[styles.tab, !activeCategory && styles.tabActive]}
            onPress={() => setActiveCategory(null)}
          >
            <Text style={[styles.tabText, !activeCategory && styles.tabTextActive]}>الكل</Text>
          </Pressable>
          {categories.map((cat) => (
            <Pressable
              key={cat}
              style={[styles.tab, activeCategory === cat && styles.tabActive]}
              onPress={() => setActiveCategory(activeCategory === cat ? null : cat)}
            >
              <Text style={[styles.tabText, activeCategory === cat && styles.tabTextActive]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Products List */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🍽️</Text>
          <Text style={styles.emptyText}>
            {activeCategory
              ? `لا يوجد منتجات في "${activeCategory}"`
              : 'لا توجد منتجات في قائمتك. اضغط "إضافة صنف" لإضافة أول منتج!'}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing[4], gap: spacing[3], paddingBottom: insets.bottom + spacing[4] }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          }
        >
          {filtered.map((product: Product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => openEditModal(product)}
              onDelete={() => handleDelete(product)}
              onToggle={(val) => toggleAvailable.mutate({ id: product.id, isAvailable: val })}
              toggling={toggleAvailable.isPending}
            />
          ))}
        </ScrollView>
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalContainer, { paddingBottom: insets.bottom + spacing[4] }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Pressable onPress={closeModal} style={styles.modalClose}>
                <X size={20} color={colors.textPrimary} />
                <Text style={styles.modalCloseText}>إلغاء</Text>
              </Pressable>
              <Text style={styles.modalTitle}>
                {editingId ? 'تعديل منتج' : 'إضافة منتج جديد'}
              </Text>
              <View style={{ width: 70 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Product Image */}
              <Pressable style={styles.imagePicker} onPress={pickImage}>
                {form.imageUri || form.imageUrl ? (
                  <Image
                    source={{ uri: form.imageUri ?? (imageUrl(form.imageUrl) ?? undefined) }}
                    style={styles.imagePreview}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Camera size={32} color={colors.textMuted} />
                    <Text style={styles.imagePlaceholderText}>اختر صورة</Text>
                  </View>
                )}
                <Pressable style={styles.imageOverlayBtn} onPress={pickImage}>
                  <Camera size={16} color="#fff" />
                  <Text style={styles.imageOverlayText}>تغيير الصورة</Text>
                </Pressable>
              </Pressable>

              <View style={styles.formBody}>
                {/* Name */}
                <FormField label="اسم المنتج">
                  <TextInput
                    style={styles.textInput}
                    value={form.name}
                    onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                    placeholder="منسف بلدي باللحم"
                    placeholderTextColor={colors.textMuted}
                    textAlign="right"
                  />
                </FormField>

                {/* Price & Category Row */}
                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}>
                    <FormField label="التصنيف">
                      <TextInput
                        style={styles.textInput}
                        value={form.category}
                        onChangeText={(v) => setForm((f) => ({ ...f, category: v }))}
                        placeholder="وجبات رئيسية"
                        placeholderTextColor={colors.textMuted}
                        textAlign="right"
                      />
                    </FormField>
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormField label="السعر (شيكل)">
                      <View style={styles.priceRow}>
                        <TextInput
                          style={[styles.textInput, { flex: 1 }]}
                          value={form.price}
                          onChangeText={(v) => setForm((f) => ({ ...f, price: v }))}
                          placeholder="75"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="decimal-pad"
                          textAlign="right"
                        />
                        <Text style={styles.currencyIcon}>₪</Text>
                      </View>
                    </FormField>
                  </View>
                </View>

                {/* Description */}
                <FormField label="وصف المنتج">
                  <TextInput
                    style={[styles.textInput, styles.textarea]}
                    value={form.description}
                    onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                    placeholder="أدخل وصفاً مختصراً للمنتج..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={4}
                    textAlign="right"
                    textAlignVertical="top"
                  />
                </FormField>

                {/* Availability toggle */}
                <View style={styles.availRow}>
                  <Switch
                    value={form.isAvailable}
                    onValueChange={(v) => setForm((f) => ({ ...f, isAvailable: v }))}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#fff"
                  />
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.availLabel}>متاح للطلب</Text>
                    <Text style={styles.availSub}>إظهار المنتج للزبائن في المتجر</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Save Button */}
            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.cancelBtn]}
                onPress={closeModal}
              >
                <Text style={styles.cancelBtnText}>إلغاء</Text>
              </Pressable>
              <Pressable
                style={[styles.saveProductBtn, isSaving && { opacity: 0.6 }]}
                onPress={handleSaveProduct}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveProductBtnText}>حفظ التعديلات</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Product Card ───────────────────────────────────────────────────────────────
function ProductCard({
  product,
  onEdit,
  onDelete,
  onToggle,
  toggling,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (v: boolean) => void;
  toggling: boolean;
}) {
  const url = imageUrl(product.imageUrl);
  return (
    <View style={pStyles.card}>
      {/* Image */}
      <View style={pStyles.imgBox}>
        {url ? (
          <Image source={{ uri: url }} style={pStyles.img} contentFit="cover" />
        ) : (
          <View style={[pStyles.img, pStyles.imgPlaceholder]}>
            <Text style={{ fontSize: 28 }}>🍽️</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={pStyles.info}>
        <View style={pStyles.topRow}>
          <Text style={pStyles.price}>{Number(product.price).toFixed(2)} ₪</Text>
          <Text style={pStyles.name}>{product.name}</Text>
        </View>
        {product.description ? (
          <Text style={pStyles.desc} numberOfLines={2}>
            {product.description}
          </Text>
        ) : null}

        {/* Actions Row */}
        <View style={pStyles.actionsRow}>
          {/* Toggle */}
          <View style={pStyles.toggleGroup}>
            <Switch
              value={product.isAvailable}
              onValueChange={onToggle}
              trackColor={{ false: colors.border, true: colors.success }}
              thumbColor="#fff"
              disabled={toggling}
            />
            <Text style={[pStyles.availText, { color: product.isAvailable ? colors.success : colors.textMuted }]}>
              {product.isAvailable ? 'متاح' : 'غير متاح'}
            </Text>
          </View>

          {/* Edit / Delete */}
          <View style={pStyles.iconBtns}>
            <Pressable style={pStyles.iconBtn} onPress={onDelete} hitSlop={8}>
              <Trash2 size={18} color={colors.textMuted} />
            </Pressable>
            <Pressable style={pStyles.iconBtn} onPress={onEdit} hitSlop={8}>
              <Pencil size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── FormField wrapper ──────────────────────────────────────────────────────────
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={ffStyles.wrapper}>
      <Text style={ffStyles.label}>{label}</Text>
      {children}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontFamily: fontFamily.extrabold,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  headerSub: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    textAlign: 'right',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  addBtnText: {
    color: '#fff',
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.sm,
  },
  tabsScroll: {
    flexGrow: 0,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  tab: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    backgroundColor: '#f5f0ea',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: '#fff',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[8],
    gap: spacing[3],
  },
  emptyIcon: { fontSize: 48 },
  emptyText: {
    fontSize: fontSizes.base,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 26,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalClose: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  modalCloseText: {
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
    fontSize: fontSizes.base,
  },
  modalTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  imagePicker: {
    height: 220,
    backgroundColor: colors.border,
    position: 'relative',
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[2],
  },
  imagePlaceholderText: {
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
    fontSize: fontSizes.sm,
  },
  imageOverlayBtn: {
    position: 'absolute',
    bottom: spacing[3],
    left: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  imageOverlayText: {
    color: '#fff',
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.sm,
  },
  formBody: {
    padding: spacing[4],
    gap: spacing[4],
  },
  twoCol: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    paddingVertical: Platform.OS === 'ios' ? spacing[3] : spacing[2],
    fontSize: fontSizes.base,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  textarea: {
    minHeight: 100,
    paddingTop: spacing[3],
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    gap: spacing[2],
  },
  currencyIcon: {
    fontSize: fontSizes.base,
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },
  availRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
  availLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  availSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'right',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
  },
  cancelBtnText: {
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
    fontSize: fontSizes.base,
  },
  saveProductBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
  },
  saveProductBtnText: {
    fontFamily: fontFamily.bold,
    color: '#fff',
    fontSize: fontSizes.base,
  },
});

const pStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    gap: spacing[3],
    minHeight: 110,
  },
  imgBox: {
    width: 110,
    flexShrink: 0,
    alignSelf: 'stretch',
  },
  img: {
    flex: 1,
    width: '100%',
  },
  imgPlaceholder: {
    backgroundColor: '#f5f0ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    padding: spacing[3],
    gap: spacing[1],
    paddingLeft: 0,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  name: {
    flex: 1,
    fontSize: fontSizes.base,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  price: {
    fontSize: fontSizes.base,
    fontFamily: fontFamily.bold,
    color: colors.primary,
    marginLeft: spacing[2],
  },
  desc: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    textAlign: 'right',
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[2],
  },
  toggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  availText: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamily.medium,
  },
  iconBtns: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  iconBtn: {
    padding: spacing[1],
  },
});

const ffStyles = StyleSheet.create({
  wrapper: {
    gap: spacing[2],
  },
  label: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
    textAlign: 'right',
  },
});
