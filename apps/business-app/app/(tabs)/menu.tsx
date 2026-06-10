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
import { useRouter } from 'expo-router';
import { Plus, Trash2, Pencil, Camera, X, ScanBarcode, ChevronDown, Package, AlertTriangle, Upload } from 'lucide-react-native';
import { businessesApi, productsApi, categoriesApi } from '@shu/api-client';
import type { Product, ProductCategory, ProductVariant } from '@shu/api-client';
import { colors, fontFamily, fontSizes, radius, spacing } from '../../src/theme';
import { uploadImage, imageUrl } from '../../src/lib/upload';
import { BarcodeScanner } from '../../components/BarcodeScanner';

// ─── Category colours (FOOD) ────────────────────────────────────────────────────
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
  categoryId: string | null;
  isAvailable: boolean;
  imageUri: string | null;
  imageUrl: string | null;
  // Store-only
  barcode: string;
  stock: string;
  lowStockAlert: string;
  unit: string;
  hasVariants: boolean;
}

const emptyForm = (): ProductForm => ({
  name: '',
  description: '',
  price: '',
  category: 'وجبات رئيسية',
  categoryId: null,
  isAvailable: true,
  imageUri: null,
  imageUrl: null,
  barcode: '',
  stock: '',
  lowStockAlert: '',
  unit: '',
  hasVariants: false,
});

function formFromProduct(p: Product): ProductForm {
  return {
    name: p.name,
    description: p.description ?? '',
    price: String(p.price),
    category: p.category ?? 'وجبات رئيسية',
    categoryId: (p as any).categoryId ?? null,
    isAvailable: p.isAvailable,
    imageUri: null,
    imageUrl: p.imageUrl ?? null,
    barcode: (p as any).barcode ?? '',
    stock: (p as any).stock !== null && (p as any).stock !== undefined ? String((p as any).stock) : '',
    lowStockAlert: (p as any).lowStockAlert !== null && (p as any).lowStockAlert !== undefined ? String((p as any).lowStockAlert) : '',
    unit: (p as any).unit ?? '',
    hasVariants: (p as any).hasVariants ?? false,
  };
}

// ─── Variant form ────────────────────────────────────────────────────────────────
interface VariantForm {
  name: string;
  price: string;
  stock: string;
  barcode: string;
}
const emptyVariantForm = (): VariantForm => ({ name: '', price: '', stock: '', barcode: '' });

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function MenuTab() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm());
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Store-only state
  const [barcodeScanVisible, setBarcodeScanVisible] = useState(false);
  const [barcodeScanTarget, setBarcodeScanTarget] = useState<'product' | 'variant'>('product');
  const [showNewCatForm, setShowNewCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [variantForm, setVariantForm] = useState<VariantForm>(emptyVariantForm());
  const [variantScanVisible, setVariantScanVisible] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [catPickerOpen, setCatPickerOpen] = useState(false);

  // ── Data fetching ─────────────────────────────────────────────────────────────
  const { data: business } = useQuery({
    queryKey: ['business-mine'],
    queryFn: () => businessesApi.mine(),
  });

  const isStore = business?.type === 'STORE';

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['my-products', business?.id],
    queryFn: () => productsApi.listByBusiness(business!.id),
    enabled: !!business,
  });

  const { data: storeCategories = [] } = useQuery({
    queryKey: ['my-categories', business?.id],
    queryFn: () => categoriesApi.listByBusiness(business!.id),
    enabled: !!business && isStore,
  });

  const { data: editingVariants = [] } = useQuery({
    queryKey: ['product-variants', editingId],
    queryFn: () => productsApi.listVariants(editingId!),
    enabled: !!editingId && isStore,
  });

  // Compute unique categories from products (FOOD uses free-text)
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p: Product) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [products]);

  const storeCategoryNames = useMemo(() => {
    const names = new Set<string>();
    products.forEach((p: any) => {
      if (p.productCategory?.name) names.add(p.productCategory.name);
    });
    return Array.from(names);
  }, [products]);

  const filtered = useMemo(() => {
    if (!activeCategory) return products;
    if (isStore) return products.filter((p: any) => p.productCategory?.name === activeCategory);
    return products.filter((p: Product) => p.category === activeCategory);
  }, [products, activeCategory, isStore]);

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

  const createCategory = useMutation({
    mutationFn: (name: string) => categoriesApi.create({ businessId: business!.id, name }),
    onSuccess: (cat: ProductCategory) => {
      queryClient.invalidateQueries({ queryKey: ['my-categories'] });
      setForm((f) => ({ ...f, categoryId: cat.id }));
      setShowNewCatForm(false);
      setNewCatName('');
    },
    onError: (err: any) => Alert.alert('خطأ', err.response?.data?.message ?? 'فشل إضافة التصنيف'),
  });

  const addVariant = useMutation({
    mutationFn: (dto: any) => productsApi.createVariant(editingId!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-variants', editingId] });
      setVariantForm(emptyVariantForm());
      setEditingVariantId(null);
    },
    onError: (err: any) => Alert.alert('خطأ', err.response?.data?.message ?? 'فشل إضافة الخيار'),
  });

  const updateVariant = useMutation({
    mutationFn: ({ vid, dto }: { vid: string; dto: any }) => productsApi.updateVariant(editingId!, vid, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-variants', editingId] });
      setVariantForm(emptyVariantForm());
      setEditingVariantId(null);
    },
    onError: (err: any) => Alert.alert('خطأ', err.response?.data?.message ?? 'فشل تعديل الخيار'),
  });

  const deleteVariant = useMutation({
    mutationFn: (vid: string) => productsApi.deleteVariant(editingId!, vid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['product-variants', editingId] }),
    onError: (err: any) => Alert.alert('خطأ', err.response?.data?.message ?? 'فشل حذف الخيار'),
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
    setShowNewCatForm(false);
    setNewCatName('');
    setVariantForm(emptyVariantForm());
    setEditingVariantId(null);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('تحتاج إذن الوصول للمعرض'); return; }
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

    const stockNum = form.stock.trim() !== '' ? parseInt(form.stock.trim(), 10) : undefined;
    const lowAlertNum = form.lowStockAlert.trim() !== '' ? parseInt(form.lowStockAlert.trim(), 10) : undefined;

    const dto: any = {
      businessId: business.id,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: priceNum,
      isAvailable: form.isAvailable,
      imageUrl: finalImageUrl ?? undefined,
      // FOOD keeps free-text category; STORE uses categoryId
      category: isStore ? undefined : (form.category.trim() || undefined),
      ...(isStore && {
        categoryId: form.categoryId ?? undefined,
        barcode: form.barcode.trim() || undefined,
        stock: stockNum,
        lowStockAlert: lowAlertNum,
        unit: form.unit.trim() || undefined,
        hasVariants: form.hasVariants,
      }),
    };

    if (editingId) {
      updateProduct.mutate({ id: editingId, dto });
    } else {
      createProduct.mutate(dto);
    }
  };

  const handleSaveVariant = () => {
    if (!variantForm.name.trim()) { Alert.alert('تنبيه', 'اسم الخيار مطلوب'); return; }
    const priceNum = parseFloat(variantForm.price);
    if (isNaN(priceNum) || priceNum < 0) { Alert.alert('تنبيه', 'السعر غير صحيح'); return; }
    const dto: any = {
      name: variantForm.name.trim(),
      price: priceNum,
      stock: variantForm.stock.trim() !== '' ? parseInt(variantForm.stock.trim(), 10) : undefined,
      barcode: variantForm.barcode.trim() || undefined,
    };
    if (editingVariantId) {
      updateVariant.mutate({ vid: editingVariantId, dto });
    } else {
      addVariant.mutate(dto);
    }
  };

  const handleDelete = (product: Product) => {
    Alert.alert('تأكيد الحذف', `حذف "${product.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deleteProduct.mutate(product.id) },
    ]);
  };

  const isSaving = createProduct.isPending || updateProduct.isPending || uploading;
  const isVariantSaving = addVariant.isPending || updateVariant.isPending;

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['my-products'] });
    setRefreshing(false);
  };

  const activeCategoryLabel = isStore
    ? (activeCategory ? activeCategory : 'إدارة المنتجات')
    : (activeCategory ? `إدارة ${activeCategory}` : 'إدارة قائمة الطعام');

  const tabCategories = isStore ? storeCategoryNames : categories;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[4] }]}>
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          <Pressable style={styles.addBtn} onPress={openAddModal}>
            <Plus size={18} color="#fff" />
            <Text style={styles.addBtnText}>إضافة {isStore ? 'منتج' : 'صنف'}</Text>
          </Pressable>
          {isStore && (
            <Pressable 
              style={[styles.addBtn, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]} 
              onPress={() => {
                if (Platform.OS === 'web') {
                  router.push('/import-products' as any);
                } else {
                  Alert.alert('ميزة الويب فقط', 'هذه الميزة متاحة على نسخة الويب فقط');
                }
              }}
            >
              <Upload size={18} color={colors.textPrimary} />
              <Text style={[styles.addBtnText, { color: colors.textPrimary }]}>استيراد</Text>
            </Pressable>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.headerTitle}>{activeCategoryLabel}</Text>
          <Text style={styles.headerSub}>{isStore ? 'إدارة منتجات المتجر' : 'عرض وتعديل قائمتك الخاصة بك'}</Text>
        </View>
      </View>

      {/* Category Tabs */}
      {tabCategories.length > 0 && (
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
          {tabCategories.map((cat) => (
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
          <Text style={styles.emptyIcon}>{isStore ? '📦' : '🍽️'}</Text>
          <Text style={styles.emptyText}>
            {activeCategory
              ? `لا يوجد منتجات في "${activeCategory}"`
              : `لا توجد منتجات. اضغط "إضافة ${isStore ? 'منتج' : 'صنف'}" للبدء!`}
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
          {filtered.map((product: any) => (
            <ProductCard
              key={product.id}
              product={product}
              isStore={isStore}
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
                    placeholder={isStore ? 'تفاحة فوجي — 1 كغ' : 'منسف بلدي باللحم'}
                    placeholderTextColor={colors.textMuted}
                    textAlign="right"
                  />
                </FormField>

                {/* Price & Category Row */}
                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}>
                    {/* FOOD: free-text category | STORE: dropdown */}
                    {isStore ? (
                      <FormField label="التصنيف">
                        <Pressable
                          style={[styles.textInput, styles.catPickerBtn]}
                          onPress={() => setCatPickerOpen((v) => !v)}
                        >
                          <ChevronDown size={16} color={colors.textMuted} />
                          <Text style={{ flex: 1, fontFamily: fontFamily.regular, fontSize: fontSizes.base, color: form.categoryId ? colors.textPrimary : colors.textMuted, textAlign: 'right' }}>
                            {form.categoryId
                              ? (storeCategories as ProductCategory[]).find((c) => c.id === form.categoryId)?.name ?? 'اختر تصنيف'
                              : 'اختر تصنيف'}
                          </Text>
                        </Pressable>
                        {catPickerOpen && (
                          <View style={styles.catDropdown}>
                            {(storeCategories as ProductCategory[]).map((cat) => (
                              <Pressable
                                key={cat.id}
                                style={[styles.catOption, form.categoryId === cat.id && styles.catOptionActive]}
                                onPress={() => { setForm((f) => ({ ...f, categoryId: cat.id })); setCatPickerOpen(false); }}
                              >
                                <Text style={[styles.catOptionText, form.categoryId === cat.id && { color: colors.primary }]}>
                                  {cat.name}
                                </Text>
                              </Pressable>
                            ))}
                            {showNewCatForm ? (
                              <View style={styles.newCatForm}>
                                <View style={styles.newCatRow}>
                                  <Pressable
                                    style={styles.newCatSaveBtn}
                                    onPress={() => newCatName.trim() && createCategory.mutate(newCatName.trim())}
                                  >
                                    {createCategory.isPending
                                      ? <ActivityIndicator size="small" color="#fff" />
                                      : <Text style={styles.newCatSaveBtnText}>إضافة</Text>}
                                  </Pressable>
                                  <TextInput
                                    style={[styles.textInput, { flex: 1, height: 40 }]}
                                    value={newCatName}
                                    onChangeText={setNewCatName}
                                    placeholder="اسم التصنيف"
                                    placeholderTextColor={colors.textMuted}
                                    textAlign="right"
                                    autoFocus
                                  />
                                </View>
                              </View>
                            ) : (
                              <Pressable
                                style={styles.catOption}
                                onPress={() => setShowNewCatForm(true)}
                              >
                                <Text style={[styles.catOptionText, { color: colors.primary }]}>
                                  ＋ إضافة تصنيف جديد
                                </Text>
                              </Pressable>
                            )}
                          </View>
                        )}
                      </FormField>
                    ) : (
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
                    )}
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

                {/* ── STORE-only fields ── */}
                {isStore && (
                  <>
                    {/* Barcode */}
                    <FormField label="الباركود">
                      <View style={styles.barcodeRow}>
                        <Pressable
                          style={styles.scanBtn}
                          onPress={() => { setBarcodeScanTarget('product'); setBarcodeScanVisible(true); }}
                        >
                          <ScanBarcode size={18} color="#fff" />
                        </Pressable>
                        <TextInput
                          style={[styles.textInput, { flex: 1 }]}
                          value={form.barcode}
                          onChangeText={(v) => setForm((f) => ({ ...f, barcode: v }))}
                          placeholder="اختياري"
                          placeholderTextColor={colors.textMuted}
                          
                          textAlign="left"
                          keyboardType="default"
                        />
                      </View>
                    </FormField>

                    {/* Stock + Unit row */}
                    <View style={styles.twoCol}>
                      <View style={{ flex: 1 }}>
                        <FormField label="الكمية في المخزن">
                          <TextInput
                            style={styles.textInput}
                            value={form.stock}
                            onChangeText={(v) => setForm((f) => ({ ...f, stock: v }))}
                            placeholder="فارغ = غير محدود"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="number-pad"
                            
                            textAlign="right"
                          />
                        </FormField>
                      </View>
                      <View style={{ flex: 1 }}>
                        <FormField label="وحدة القياس">
                          <TextInput
                            style={styles.textInput}
                            value={form.unit}
                            onChangeText={(v) => setForm((f) => ({ ...f, unit: v }))}
                            placeholder="كغ، حبة، علبة..."
                            placeholderTextColor={colors.textMuted}
                            textAlign="right"
                          />
                        </FormField>
                      </View>
                    </View>

                    {/* Low stock alert — only if stock is filled */}
                    {form.stock.trim() !== '' && (
                      <FormField label="تنبيه المخزون المنخفض">
                        <TextInput
                          style={styles.textInput}
                          value={form.lowStockAlert}
                          onChangeText={(v) => setForm((f) => ({ ...f, lowStockAlert: v }))}
                          placeholder="تنبّه عند وصول المخزون لـ..."
                          placeholderTextColor={colors.textMuted}
                          keyboardType="number-pad"
                          
                          textAlign="right"
                        />
                      </FormField>
                    )}

                    {/* Has Variants toggle */}
                    <View style={styles.availRow}>
                      <Switch
                        value={form.hasVariants}
                        onValueChange={(v) => setForm((f) => ({ ...f, hasVariants: v }))}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor="#fff"
                      />
                      <View style={{ alignItems: 'flex-end', flex: 1 }}>
                        <Text style={styles.availLabel}>هذا المنتج له خيارات</Text>
                        <Text style={styles.availSub}>مثلاً: حجم، وزن، نوع...</Text>
                      </View>
                    </View>

                    {/* Variants section — only when editing + hasVariants */}
                    {form.hasVariants && editingId && (
                      <View style={styles.variantsSection}>
                        <Text style={styles.variantsSectionTitle}>الخيارات المتاحة</Text>

                        {/* Existing variants list */}
                        {(editingVariants as ProductVariant[]).map((v) => {
                          const isEditingThis = editingVariantId === v.id;
                          return (
                            <View key={v.id} style={styles.variantRow}>
                              {isEditingThis ? (
                                <VariantInlineForm
                                  form={variantForm}
                                  setForm={setVariantForm}
                                  onSave={handleSaveVariant}
                                  onCancel={() => { setEditingVariantId(null); setVariantForm(emptyVariantForm()); }}
                                  isSaving={isVariantSaving}
                                  onScanBarcode={() => setVariantScanVisible(true)}
                                />
                              ) : (
                                <>
                                  <View style={styles.variantInfo}>
                                    <Text style={styles.variantName}>{v.name}</Text>
                                    <Text style={styles.variantMeta}>
                                      {Number(v.price).toFixed(2)} ₪
                                      {v.stock !== null ? ` · ${v.stock} وحدة` : ''}
                                    </Text>
                                  </View>
                                  <View style={styles.variantActions}>
                                    <Pressable
                                      hitSlop={8}
                                      onPress={() => {
                                        Alert.alert('حذف الخيار', `حذف "${v.name}"؟`, [
                                          { text: 'إلغاء', style: 'cancel' },
                                          { text: 'حذف', style: 'destructive', onPress: () => deleteVariant.mutate(v.id) },
                                        ]);
                                      }}
                                    >
                                      <Trash2 size={16} color={colors.textMuted} />
                                    </Pressable>
                                    <Pressable
                                      hitSlop={8}
                                      onPress={() => {
                                        setEditingVariantId(v.id);
                                        setVariantForm({
                                          name: v.name,
                                          price: String(v.price),
                                          stock: v.stock !== null ? String(v.stock) : '',
                                          barcode: v.barcode ?? '',
                                        });
                                      }}
                                    >
                                      <Pencil size={16} color={colors.textMuted} />
                                    </Pressable>
                                  </View>
                                </>
                              )}
                            </View>
                          );
                        })}

                        {/* New variant form */}
                        {!editingVariantId && (
                          <VariantInlineForm
                            form={variantForm}
                            setForm={setVariantForm}
                            onSave={handleSaveVariant}
                            onCancel={undefined}
                            isSaving={isVariantSaving}
                            onScanBarcode={() => setVariantScanVisible(true)}
                          />
                        )}
                      </View>
                    )}
                  </>
                )}

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
              <Pressable style={[styles.cancelBtn]} onPress={closeModal}>
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

      {/* Barcode Scanner — product barcode */}
      <BarcodeScanner
        visible={barcodeScanVisible}
        onScanned={(code) => {
          setForm((f) => ({ ...f, barcode: code }));
          setBarcodeScanVisible(false);
        }}
        onClose={() => setBarcodeScanVisible(false)}
      />

      {/* Barcode Scanner — variant barcode */}
      <BarcodeScanner
        visible={variantScanVisible}
        onScanned={(code) => {
          setVariantForm((f) => ({ ...f, barcode: code }));
          setVariantScanVisible(false);
        }}
        onClose={() => setVariantScanVisible(false)}
      />
    </View>
  );
}

// ─── Variant inline form ────────────────────────────────────────────────────────
function VariantInlineForm({
  form,
  setForm,
  onSave,
  onCancel,
  isSaving,
  onScanBarcode,
}: {
  form: VariantForm;
  setForm: (f: VariantForm | ((prev: VariantForm) => VariantForm)) => void;
  onSave: () => void;
  onCancel?: () => void;
  isSaving: boolean;
  onScanBarcode: () => void;
}) {
  return (
    <View style={styles.variantInlineForm}>
      <Text style={styles.variantFormTitle}>{onCancel ? 'تعديل الخيار' : 'إضافة خيار جديد'}</Text>
      <View style={styles.twoCol}>
        <View style={{ flex: 2 }}>
          <FormField label="الاسم">
            <TextInput
              style={styles.textInput}
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="500 غرام"
              placeholderTextColor={colors.textMuted}
              textAlign="right"
            />
          </FormField>
        </View>
        <View style={{ flex: 1 }}>
          <FormField label="السعر ₪">
            <TextInput
              style={styles.textInput}
              value={form.price}
              onChangeText={(v) => setForm((f) => ({ ...f, price: v }))}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              
              textAlign="right"
            />
          </FormField>
        </View>
      </View>
      <View style={styles.twoCol}>
        <View style={{ flex: 1 }}>
          <FormField label="الكمية">
            <TextInput
              style={styles.textInput}
              value={form.stock}
              onChangeText={(v) => setForm((f) => ({ ...f, stock: v }))}
              placeholder="اختياري"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              
              textAlign="right"
            />
          </FormField>
        </View>
        <View style={{ flex: 1 }}>
          <FormField label="الباركود">
            <View style={styles.barcodeRow}>
              <Pressable style={styles.scanBtn} onPress={onScanBarcode}>
                <ScanBarcode size={16} color="#fff" />
              </Pressable>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                value={form.barcode}
                onChangeText={(v) => setForm((f) => ({ ...f, barcode: v }))}
                placeholder="اختياري"
                placeholderTextColor={colors.textMuted}
                
                textAlign="left"
              />
            </View>
          </FormField>
        </View>
      </View>
      <View style={styles.variantFormBtns}>
        {onCancel && (
          <Pressable style={styles.variantCancelBtn} onPress={onCancel}>
            <Text style={styles.variantCancelBtnText}>إلغاء</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.variantSaveBtn, isSaving && { opacity: 0.6 }]}
          onPress={onSave}
          disabled={isSaving}
        >
          {isSaving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.variantSaveBtnText}>{onCancel ? 'حفظ' : 'إضافة الخيار'}</Text>}
        </Pressable>
      </View>
    </View>
  );
}

// ─── Product Card ───────────────────────────────────────────────────────────────
function ProductCard({
  product,
  isStore,
  onEdit,
  onDelete,
  onToggle,
  toggling,
}: {
  product: any;
  isStore: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (v: boolean) => void;
  toggling: boolean;
}) {
  const url = imageUrl(product.imageUrl);
  const isLowStock = isStore && product.stock !== null && product.stock !== undefined
    && product.lowStockAlert !== null && product.lowStockAlert !== undefined
    && product.stock <= product.lowStockAlert;

  return (
    <View style={[pStyles.card, isLowStock && pStyles.cardLowStock]}>
      {/* Image */}
      <View style={pStyles.imgBox}>
        {url ? (
          <Image source={{ uri: url }} style={pStyles.img} contentFit="cover" />
        ) : (
          <View style={[pStyles.img, pStyles.imgPlaceholder]}>
            <Text style={{ fontSize: 28 }}>{isStore ? '📦' : '🍽️'}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={pStyles.info}>
        <View style={pStyles.topRow}>
          <Text style={pStyles.price}>{Number(product.price).toFixed(2)} ₪</Text>
          <Text style={pStyles.name}>{product.name}</Text>
        </View>

        {/* Store-specific badges */}
        {isStore && (
          <View style={pStyles.storeMeta}>
            {product.productCategory?.name && (
              <View style={pStyles.catBadge}>
                <Text style={pStyles.catBadgeText}>{product.productCategory.name}</Text>
              </View>
            )}
            {product.stock !== null && product.stock !== undefined ? (
              <View style={[pStyles.stockBadge, isLowStock && pStyles.stockBadgeLow]}>
                {isLowStock && <AlertTriangle size={11} color={isLowStock ? '#92400E' : colors.secondary} />}
                <Text style={[pStyles.stockText, isLowStock && pStyles.stockTextLow]}>
                  {product.stock === 0 ? 'نفد المخزون' : `${product.stock} ${product.unit || 'وحدة'}`}
                </Text>
              </View>
            ) : (
              <View style={pStyles.stockBadge}>
                <Text style={pStyles.stockText}>غير محدود</Text>
              </View>
            )}
          </View>
        )}

        {product.description ? (
          <Text style={pStyles.desc} numberOfLines={2}>
            {product.description}
          </Text>
        ) : null}

        {/* Actions Row */}
        <View style={pStyles.actionsRow}>
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
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontFamily: fontFamily.medium, fontSize: fontSizes.sm, color: colors.textMuted },
  tabTextActive: { color: '#fff' },
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
  modalContainer: { flex: 1, backgroundColor: colors.background },
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
  modalClose: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  modalCloseText: { fontFamily: fontFamily.medium, color: colors.textMuted, fontSize: fontSizes.base },
  modalTitle: { fontFamily: fontFamily.bold, fontSize: fontSizes.lg, color: colors.textPrimary, textAlign: 'center' },
  imagePicker: { height: 220, backgroundColor: colors.border, position: 'relative', overflow: 'hidden' },
  imagePreview: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing[2] },
  imagePlaceholderText: { fontFamily: fontFamily.medium, color: colors.textMuted, fontSize: fontSizes.sm },
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
  imageOverlayText: { color: '#fff', fontFamily: fontFamily.medium, fontSize: fontSizes.sm },
  formBody: { padding: spacing[4], gap: spacing[4] },
  twoCol: { flexDirection: 'row', gap: spacing[3] },
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
  textarea: { minHeight: 100, paddingTop: spacing[3] },
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
  currencyIcon: { fontSize: fontSizes.base, fontFamily: fontFamily.bold, color: colors.primary },
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
  availLabel: { fontFamily: fontFamily.bold, fontSize: fontSizes.base, color: colors.textPrimary, textAlign: 'right' },
  availSub: { fontFamily: fontFamily.regular, fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'right' },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[4] },
  cancelBtnText: { fontFamily: fontFamily.medium, color: colors.textMuted, fontSize: fontSizes.base },
  saveProductBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
  },
  saveProductBtnText: { fontFamily: fontFamily.bold, color: '#fff', fontSize: fontSizes.base },
  // Store-only form styles
  catPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'ios' ? spacing[3] : spacing[2],
  },
  catDropdown: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginTop: 4,
    overflow: 'hidden',
  },
  catOption: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  catOptionActive: { backgroundColor: colors.primary + '10' },
  catOptionText: { fontFamily: fontFamily.medium, fontSize: fontSizes.base, color: colors.textPrimary, textAlign: 'right' },
  newCatForm: { padding: spacing[2] },
  newCatRow: { flexDirection: 'row', gap: spacing[2], alignItems: 'center' },
  newCatSaveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newCatSaveBtnText: { fontFamily: fontFamily.bold, fontSize: fontSizes.sm, color: '#fff' },
  barcodeRow: { flexDirection: 'row', gap: spacing[2], alignItems: 'center' },
  scanBtn: {
    width: 40,
    height: 40,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  // Variants section
  variantsSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  variantsSectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    textAlign: 'right',
    padding: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#f5f0ea',
  },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing[2],
  },
  variantInfo: { flex: 1, alignItems: 'flex-end' },
  variantName: { fontFamily: fontFamily.bold, fontSize: fontSizes.sm, color: colors.textPrimary },
  variantMeta: { fontFamily: fontFamily.regular, fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  variantActions: { flexDirection: 'row', gap: spacing[3] },
  variantInlineForm: { padding: spacing[3], borderTopWidth: 1, borderTopColor: colors.border, gap: spacing[3] },
  variantFormTitle: { fontFamily: fontFamily.bold, fontSize: fontSizes.sm, color: colors.primary, textAlign: 'right' },
  variantFormBtns: { flexDirection: 'row', gap: spacing[2] },
  variantCancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing[2], alignItems: 'center' },
  variantCancelBtnText: { fontFamily: fontFamily.medium, fontSize: fontSizes.sm, color: colors.textMuted },
  variantSaveBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing[2], alignItems: 'center', justifyContent: 'center', height: 40 },
  variantSaveBtnText: { fontFamily: fontFamily.bold, fontSize: fontSizes.sm, color: '#fff' },
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
  cardLowStock: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBF0',
  },
  imgBox: { width: 110, flexShrink: 0, alignSelf: 'stretch' },
  img: { flex: 1, width: '100%' },
  imgPlaceholder: { backgroundColor: '#f5f0ea', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, padding: spacing[3], gap: spacing[1], paddingLeft: 0 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { flex: 1, fontSize: fontSizes.base, fontFamily: fontFamily.bold, color: colors.textPrimary, textAlign: 'right' },
  price: { fontSize: fontSizes.base, fontFamily: fontFamily.bold, color: colors.primary, marginLeft: spacing[2] },
  desc: { fontSize: fontSizes.sm, fontFamily: fontFamily.regular, color: colors.textMuted, textAlign: 'right', lineHeight: 20 },
  storeMeta: { flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: 2 },
  catBadge: {
    backgroundColor: colors.secondary + '15',
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  catBadgeText: { fontFamily: fontFamily.medium, fontSize: fontSizes.xs, color: colors.secondary },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.border + '80',
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  stockBadgeLow: { backgroundColor: '#FEF3C7' },
  stockText: { fontFamily: fontFamily.medium, fontSize: fontSizes.xs, color: colors.textMuted },
  stockTextLow: { color: '#92400E' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing[2] },
  toggleGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  availText: { fontSize: fontSizes.sm, fontFamily: fontFamily.medium },
  iconBtns: { flexDirection: 'row', gap: spacing[2] },
  iconBtn: { padding: spacing[1] },
});

const ffStyles = StyleSheet.create({
  wrapper: { gap: spacing[2] },
  label: { fontSize: fontSizes.sm, fontFamily: fontFamily.medium, color: colors.textMuted, textAlign: 'right' },
});

interface VariantForm {
  name: string;
  price: string;
  stock: string;
  barcode: string;
}
