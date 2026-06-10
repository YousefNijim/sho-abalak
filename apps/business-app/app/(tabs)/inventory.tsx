import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Package, AlertTriangle, ScanBarcode, Plus, Minus, Check } from 'lucide-react-native';
import { businessesApi, productsApi } from '@shu/api-client';
import { colors, fontFamily, fontSizes, radius, spacing } from '../../src/theme';
import { BarcodeScanner } from '../../components/BarcodeScanner';

export default function InventoryTab() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [quickUpdateProduct, setQuickUpdateProduct] = useState<any | null>(null);
  const [stockDraft, setStockDraft] = useState('');
  const [barcodeScanVisible, setBarcodeScanVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: business } = useQuery({
    queryKey: ['business-mine'],
    queryFn: () => businessesApi.mine(),
  });

  const isStore = business?.type === 'STORE';

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['my-products', business?.id],
    queryFn: () => productsApi.listByBusiness(business!.id),
    enabled: !!business,
  });

  const { data: lowStockProducts = [] } = useQuery({
    queryKey: ['low-stock-products', business?.id],
    queryFn: () => productsApi.getLowStock(business!.id),
    enabled: !!business && isStore,
  });

  const updateStock = useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number }) =>
      productsApi.update(id, { stock }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-products'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-products'] });
      setQuickUpdateProduct(null);
    },
    onError: (err: any) => Alert.alert('خطأ', err.response?.data?.message ?? 'فشل تحديث المخزون'),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['my-products'] }),
      queryClient.invalidateQueries({ queryKey: ['low-stock-products'] }),
    ]);
    setRefreshing(false);
  };

  const handleBarcodeScanned = (code: string) => {
    setBarcodeScanVisible(false);
    const product = (allProducts as any[]).find((p) => p.barcode === code);
    if (product) {
      openQuickUpdate(product);
    } else {
      Alert.alert('لم يُعثر على المنتج', `لا يوجد منتج بالباركود: ${code}`);
    }
  };

  const openQuickUpdate = (product: any) => {
    setQuickUpdateProduct(product);
    setStockDraft(product.stock !== null && product.stock !== undefined ? String(product.stock) : '');
  };

  const handleSaveStock = () => {
    if (!quickUpdateProduct) return;
    const stockNum = stockDraft.trim() !== '' ? parseInt(stockDraft.trim(), 10) : null;
    if (stockNum !== null && isNaN(stockNum)) {
      Alert.alert('تنبيه', 'أدخل رقماً صحيحاً');
      return;
    }
    updateStock.mutate({ id: quickUpdateProduct.id, stock: stockNum as any });
  };

  const storeProducts = (allProducts as any[]).filter((p) => p.stock !== null && p.stock !== undefined);

  const displayed = (() => {
    if (filter === 'low') return (lowStockProducts as any[]);
    if (filter === 'out') return storeProducts.filter((p) => p.stock === 0);
    return storeProducts;
  })();

  const lowCount = (lowStockProducts as any[]).length;
  const outCount = storeProducts.filter((p) => p.stock === 0).length;

  if (!isStore) {
    return (
      <View style={styles.notStoreWrap}>
        <Package size={64} color={colors.border} strokeWidth={1.5} />
        <Text style={styles.notStoreTitle}>إدارة المخزون</Text>
        <Text style={styles.notStoreDesc}>
          هذه الخاصية مخصصة للمتاجر والسوبرماركت فقط.{'\n'}مطاعم لا تحتاج تتبع مخزون.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[4] }]}>
        <Pressable
          style={styles.scanFab}
          onPress={() => setBarcodeScanVisible(true)}
        >
          <ScanBarcode size={18} color="#fff" />
          <Text style={styles.scanFabText}>مسح باركود</Text>
        </Pressable>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.headerTitle}>إدارة المخزون</Text>
          <Text style={styles.headerSub}>تتبع الكميات والتنبيهات</Text>
        </View>
      </View>

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <SummaryCard
          label="مخزون منخفض"
          count={lowCount}
          color="#F59E0B"
          icon={<AlertTriangle size={20} color="#F59E0B" />}
          onPress={() => setFilter(filter === 'low' ? 'all' : 'low')}
          active={filter === 'low'}
        />
        <SummaryCard
          label="نفد المخزون"
          count={outCount}
          color="#EF4444"
          icon={<Package size={20} color="#EF4444" />}
          onPress={() => setFilter(filter === 'out' ? 'all' : 'out')}
          active={filter === 'out'}
        />
        <SummaryCard
          label="كل المنتجات"
          count={storeProducts.length}
          color={colors.secondary}
          icon={<Package size={20} color={colors.secondary} />}
          onPress={() => setFilter('all')}
          active={filter === 'all'}
        />
      </View>

      {/* Product list */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : displayed.length === 0 ? (
        <View style={styles.empty}>
          <Package size={48} color={colors.border} strokeWidth={1.5} />
          <Text style={styles.emptyText}>
            {filter === 'low' ? 'لا يوجد منتجات بمخزون منخفض' :
             filter === 'out' ? 'لا يوجد منتجات نفد مخزونها' :
             'لا يوجد منتجات بتتبع مخزون'}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing[4], gap: spacing[3], paddingBottom: insets.bottom + spacing[4] }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {displayed.map((product: any) => {
            const isLow = product.lowStockAlert !== null
              && product.lowStockAlert !== undefined
              && product.stock <= product.lowStockAlert;
            const isOut = product.stock === 0;

            return (
              <Pressable
                key={product.id}
                style={[styles.productRow, isOut && styles.productRowOut, isLow && !isOut && styles.productRowLow]}
                onPress={() => openQuickUpdate(product)}
              >
                {/* Status indicator */}
                <View style={[styles.statusDot, { backgroundColor: isOut ? '#EF4444' : isLow ? '#F59E0B' : '#22C55E' }]} />

                {/* Info */}
                <View style={styles.productInfo}>
                  {product.productCategory?.name && (
                    <Text style={styles.catLabel}>{product.productCategory.name}</Text>
                  )}
                  <Text style={styles.productName}>{product.name}</Text>
                  {product.barcode ? (
                    <Text style={styles.barcodeLabel}>{product.barcode}</Text>
                  ) : null}
                </View>

                {/* Stock badge */}
                <View style={styles.stockRight}>
                  <View style={[styles.stockBadge, isOut && styles.stockBadgeOut, isLow && !isOut && styles.stockBadgeLow]}>
                    <Text style={[styles.stockNum, isOut && styles.stockNumOut, isLow && !isOut && styles.stockNumLow]}>
                      {isOut ? 'نفد' : product.stock}
                    </Text>
                    {!isOut && product.unit && (
                      <Text style={[styles.stockUnit, isLow && { color: '#92400E' }]}>{product.unit}</Text>
                    )}
                  </View>
                  {isLow && !isOut && (
                    <AlertTriangle size={14} color="#F59E0B" style={{ marginTop: 2 }} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Quick update modal */}
      <Modal
        visible={!!quickUpdateProduct}
        transparent
        animationType="fade"
        onRequestClose={() => setQuickUpdateProduct(null)}
      >
        <Pressable style={styles.qModalOverlay} onPress={() => setQuickUpdateProduct(null)} />
        <View style={styles.qModal}>
          <Text style={styles.qModalTitle}>{quickUpdateProduct?.name}</Text>
          {quickUpdateProduct?.productCategory?.name && (
            <Text style={styles.qModalCat}>{quickUpdateProduct.productCategory.name}</Text>
          )}

          <Text style={styles.qModalLabel}>الكمية الحالية في المخزن</Text>

          {/* Stepper */}
          <View style={styles.stepperRow}>
            <Pressable
              style={styles.stepperBtn}
              onPress={() => {
                const v = parseInt(stockDraft || '0', 10);
                if (!isNaN(v) && v > 0) setStockDraft(String(v - 1));
              }}
            >
              <Minus size={20} color={colors.textPrimary} />
            </Pressable>
            <TextInput
              style={styles.stepperInput}
              value={stockDraft}
              onChangeText={setStockDraft}
              keyboardType="number-pad"
              textAlign="center"
              
              placeholder="0"
              placeholderTextColor={colors.textMuted}
            />
            <Pressable
              style={styles.stepperBtn}
              onPress={() => {
                const v = parseInt(stockDraft || '0', 10);
                if (!isNaN(v)) setStockDraft(String(v + 1));
              }}
            >
              <Plus size={20} color={colors.textPrimary} />
            </Pressable>
          </View>

          {quickUpdateProduct?.unit && (
            <Text style={styles.qModalUnit}>الوحدة: {quickUpdateProduct.unit}</Text>
          )}
          {quickUpdateProduct?.lowStockAlert !== null && quickUpdateProduct?.lowStockAlert !== undefined && (
            <Text style={styles.qModalAlert}>
              تنبيه عند: {quickUpdateProduct.lowStockAlert} {quickUpdateProduct.unit || 'وحدة'}
            </Text>
          )}

          <View style={styles.qModalBtns}>
            <Pressable style={styles.qModalCancel} onPress={() => setQuickUpdateProduct(null)}>
              <Text style={styles.qModalCancelText}>إلغاء</Text>
            </Pressable>
            <Pressable
              style={[styles.qModalSave, updateStock.isPending && { opacity: 0.6 }]}
              onPress={handleSaveStock}
              disabled={updateStock.isPending}
            >
              {updateStock.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : (
                  <>
                    <Check size={16} color="#fff" />
                    <Text style={styles.qModalSaveText}>حفظ</Text>
                  </>
                )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Barcode scanner */}
      <BarcodeScanner
        visible={barcodeScanVisible}
        onScanned={handleBarcodeScanned}
        onClose={() => setBarcodeScanVisible(false)}
      />
    </View>
  );
}

function SummaryCard({
  label,
  count,
  color,
  icon,
  onPress,
  active,
}: {
  label: string;
  count: number;
  color: string;
  icon: React.ReactNode;
  onPress: () => void;
  active: boolean;
}) {
  return (
    <Pressable
      style={[styles.summaryCard, active && { borderColor: color, borderWidth: 2 }]}
      onPress={onPress}
    >
      {icon}
      <Text style={[styles.summaryCount, { color }]}>{count}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  notStoreWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[8],
    gap: spacing[4],
  },
  notStoreTitle: {
    fontSize: fontSizes['2xl'],
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  notStoreDesc: {
    fontSize: fontSizes.base,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 26,
  },
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
  scanFab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  scanFabText: { color: '#fff', fontFamily: fontFamily.bold, fontSize: fontSizes.sm },
  summaryRow: {
    flexDirection: 'row',
    padding: spacing[4],
    gap: spacing[3],
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[3],
    alignItems: 'center',
    gap: spacing[1],
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryCount: { fontSize: fontSizes['2xl'], fontFamily: fontFamily.extrabold },
  summaryLabel: { fontSize: fontSizes.xs, fontFamily: fontFamily.medium, color: colors.textMuted, textAlign: 'center' },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[8],
    gap: spacing[3],
  },
  emptyText: { fontSize: fontSizes.base, fontFamily: fontFamily.medium, color: colors.textMuted, textAlign: 'center' },
  // Product row
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[3],
    gap: spacing[3],
  },
  productRowLow: { borderColor: '#F59E0B', backgroundColor: '#FFFBF0' },
  productRowOut: { borderColor: '#EF4444', backgroundColor: '#FFF5F5' },
  statusDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  productInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
  catLabel: { fontSize: fontSizes.xs, fontFamily: fontFamily.medium, color: colors.secondary },
  productName: { fontSize: fontSizes.base, fontFamily: fontFamily.bold, color: colors.textPrimary, textAlign: 'right' },
  barcodeLabel: { fontSize: fontSizes.xs, fontFamily: fontFamily.regular, color: colors.textMuted },
  stockRight: { alignItems: 'center', gap: 2 },
  stockBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    alignItems: 'center',
  },
  stockBadgeLow: { backgroundColor: '#FEF3C7' },
  stockBadgeOut: { backgroundColor: '#FEE2E2' },
  stockNum: { fontSize: fontSizes.lg, fontFamily: fontFamily.extrabold, color: '#065F46' },
  stockNumLow: { color: '#92400E' },
  stockNumOut: { color: '#991B1B' },
  stockUnit: { fontSize: fontSizes.xs, fontFamily: fontFamily.medium, color: '#065F46' },
  // Quick update modal
  qModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  qModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing[6],
    gap: spacing[3],
  },
  qModalTitle: { fontSize: fontSizes.xl, fontFamily: fontFamily.bold, color: colors.textPrimary, textAlign: 'right' },
  qModalCat: { fontSize: fontSizes.sm, fontFamily: fontFamily.medium, color: colors.secondary, textAlign: 'right', marginTop: -spacing[2] },
  qModalLabel: { fontSize: fontSizes.sm, fontFamily: fontFamily.medium, color: colors.textMuted, textAlign: 'right' },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    justifyContent: 'center',
    marginVertical: spacing[2],
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperInput: {
    width: 100,
    height: 56,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    fontSize: fontSizes['2xl'],
    fontFamily: fontFamily.extrabold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  qModalUnit: { fontSize: fontSizes.sm, fontFamily: fontFamily.regular, color: colors.textMuted, textAlign: 'center' },
  qModalAlert: { fontSize: fontSizes.sm, fontFamily: fontFamily.medium, color: '#92400E', textAlign: 'center' },
  qModalBtns: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
  qModalCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  qModalCancelText: { fontFamily: fontFamily.medium, color: colors.textMuted, fontSize: fontSizes.base },
  qModalSave: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  qModalSaveText: { fontFamily: fontFamily.bold, color: '#fff', fontSize: fontSizes.base },
});
