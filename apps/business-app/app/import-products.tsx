import {
  Platform,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react-native';
import { useState } from 'react';
import * as xlsx from 'xlsx';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { businessesApi, productsApi } from '@shu/api-client';
import type { ImportResult } from '@shu/api-client';
import { colors, fontFamily, fontSizes, radius, spacing } from '../src/theme';

export default function ImportProductsScreen() {
  const router = useRouter();

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.mobileGuard}>
        <AlertTriangle size={48} color={colors.warning} style={{ marginBottom: spacing[4] }} />
        <Text style={styles.mobileGuardTitle}>هذه الميزة متاحة على النسخة الويب فقط</Text>
        <Text style={styles.mobileGuardSub}>يرجى فتح التطبيق من المتصفح على الحاسوب لاستيراد المنتجات عبر ملفات Excel أو CSV</Text>
        <Pressable style={styles.actionBtn} onPress={() => router.back()}>
          <Text style={styles.actionBtnText}>العودة للوراء</Text>
        </Pressable>
      </View>
    );
  }

  // Web only code below
  const queryClient = useQueryClient();
  const { data: business } = useQuery({ queryKey: ['business-mine'], queryFn: () => businessesApi.mine() });

  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const importMutation = useMutation({
    mutationFn: () => productsApi.importProducts(business!.id, file as Blob),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['my-products'] });
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err.response?.data?.message || 'حدث خطأ أثناء الاستيراد');
    },
  });

  const handleDownloadTemplate = async () => {
    try {
      const blob = await productsApi.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'products-template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      Alert.alert('خطأ', 'فشل تحميل القالب');
    }
  };

  const handleFileChange = async (e: any) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = xlsx.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawData = xlsx.utils.sheet_to_json<any>(sheet, { header: 1 });

        const dataRows = rawData.slice(2).filter((row: any) => row.length > 0 && row.some((v: any) => v !== undefined && v !== null && v !== ''));

        setTotalRows(dataRows.length);
        setPreviewRows(dataRows.slice(0, 5));
      } catch (err) {
        Alert.alert('خطأ', 'الملف غير صالح أو لا يمكن قراءته');
        setFile(null);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronRight size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>استيراد منتجات</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Section 1: Template */}
        <View style={styles.card}>
          <View style={styles.cardIconBox}>
            <FileSpreadsheet size={24} color={colors.primary} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>حمّل قالب Excel</Text>
            <Text style={styles.cardSub}>أضف منتجاتك في القالب ثم ارفعه. (يرجى عدم تغيير أسماء الأعمدة في السطر الثاني)</Text>
          </View>
          <Pressable style={styles.downloadBtn} onPress={handleDownloadTemplate}>
            <Download size={18} color="#fff" />
            <Text style={styles.downloadBtnText}>تحميل القالب</Text>
          </Pressable>
        </View>

        {/* Section 2: Upload or Results */}
        {!result ? (
          <View style={styles.uploadSection}>
            <View style={styles.dropZone}>
              <Upload size={32} color={colors.textMuted} style={{ marginBottom: spacing[2] }} />
              <Text style={styles.dropText}>اسحب ملف Excel أو CSV هنا</Text>
              <Text style={styles.dropSub}>أو</Text>
              
              <View style={styles.fileInputWrapper}>
                <Pressable style={styles.browseBtn}>
                  <Text style={styles.browseBtnText}>اختر ملف</Text>
                </Pressable>
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={handleFileChange}
                  style={styles.hiddenInput as any}
                />
              </View>
            </View>

            {file && (
              <View style={styles.previewContainer}>
                <Text style={styles.fileInfo}>الملف المحدد: {file.name} ({(file.size / 1024).toFixed(1)} KB)</Text>
                
                {previewRows.length > 0 && (
                  <View style={styles.tableWrapper}>
                    <Text style={styles.previewTitle}>معاينة البيانات (أول 5 صفوف):</Text>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.cell, { flex: 2 }]}>الاسم</Text>
                      <Text style={styles.cell}>التصنيف</Text>
                      <Text style={styles.cell}>السعر</Text>
                      <Text style={styles.cell}>الكمية</Text>
                      <Text style={styles.cell}>الباركود</Text>
                    </View>
                    {previewRows.map((row, i) => (
                      <View key={i} style={styles.tableRow}>
                        <Text style={[styles.cell, { flex: 2 }]} numberOfLines={1}>{row[0]}</Text>
                        <Text style={styles.cell} numberOfLines={1}>{row[1]}</Text>
                        <Text style={styles.cell}>{row[2]}</Text>
                        <Text style={styles.cell}>{row[3]}</Text>
                        <Text style={styles.cell}>{row[4]}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.actions}>
                  <Pressable
                    style={styles.cancelBtn}
                    onPress={() => { setFile(null); setPreviewRows([]); }}
                  >
                    <Text style={styles.cancelBtnText}>إلغاء</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.importBtn, importMutation.isPending && { opacity: 0.7 }]}
                    onPress={() => importMutation.mutate()}
                    disabled={importMutation.isPending}
                  >
                    {importMutation.isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.importBtnText}>استيراد {totalRows} منتج</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.resultsSection}>
            <View style={styles.successCard}>
              <CheckCircle size={32} color={colors.success} style={{ marginBottom: spacing[2] }} />
              <Text style={styles.successTitle}>تم الاستيراد بنجاح</Text>
              <Text style={styles.successText}>تم إضافة {result.created} منتج جديد</Text>
              <Text style={styles.successText}>تم تحديث {result.updated} منتج موجود</Text>
            </View>

            {result.skipped > 0 && (
              <View style={styles.warningCard}>
                <AlertTriangle size={24} color={colors.warning} style={{ marginBottom: spacing[2] }} />
                <Text style={styles.warningTitle}>تم تخطّي {result.skipped} صف</Text>
              </View>
            )}

            {result.errors.length > 0 && (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>⚠️ {result.errors.length} خطأ في البيانات</Text>
                <View style={styles.errorList}>
                  {result.errors.slice(0, 10).map((err: any, i: number) => (
                    <View key={i} style={styles.errorItem}>
                      <Text style={styles.errorRow}>صف {err.row}:</Text>
                      <Text style={styles.errorReason}>{err.reason}</Text>
                    </View>
                  ))}
                  {result.errors.length > 10 && (
                    <Text style={styles.errorMore}>... و {result.errors.length - 10} أخطاء أخرى</Text>
                  )}
                </View>
              </View>
            )}

            <View style={styles.actions}>
              <Pressable style={styles.actionBtn} onPress={() => router.back()}>
                <Text style={styles.actionBtnText}>العودة للمنيو</Text>
              </Pressable>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => { setResult(null); setFile(null); setPreviewRows([]); }}
              >
                <Text style={styles.cancelBtnText}>استيراد ملف آخر</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mobileGuard: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing[6] },
  mobileGuardTitle: { fontFamily: fontFamily.bold, fontSize: fontSizes.xl, color: colors.textPrimary, marginBottom: spacing[2], textAlign: 'center' },
  mobileGuardSub: { fontFamily: fontFamily.regular, fontSize: fontSizes.base, color: colors.textMuted, textAlign: 'center', marginBottom: spacing[8] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing[4], backgroundColor: '#fff', borderBottomWidth: 1, borderColor: colors.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fontFamily.bold, fontSize: fontSizes.xl, color: colors.textPrimary },
  content: { padding: spacing[4] },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: spacing[4], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing[6] },
  cardIconBox: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center', marginLeft: spacing[4] },
  cardBody: { flex: 1 },
  cardTitle: { fontFamily: fontFamily.bold, fontSize: fontSizes.lg, color: colors.textPrimary, marginBottom: spacing[1], textAlign: 'right' },
  cardSub: { fontFamily: fontFamily.regular, fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'right' },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: radius.md, gap: spacing[2] },
  downloadBtnText: { fontFamily: fontFamily.medium, fontSize: fontSizes.base, color: '#fff' },
  uploadSection: {},
  dropZone: { borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', borderRadius: radius.lg, padding: spacing[6], alignItems: 'center', backgroundColor: '#fff' },
  dropText: { fontFamily: fontFamily.medium, fontSize: fontSizes.lg, color: colors.textPrimary, marginBottom: spacing[2] },
  dropSub: { fontFamily: fontFamily.regular, fontSize: fontSizes.sm, color: colors.textMuted, marginBottom: spacing[4] },
  fileInputWrapper: { position: 'relative', overflow: 'hidden' },
  browseBtn: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing[6], paddingVertical: spacing[3], borderRadius: radius.md },
  browseBtnText: { fontFamily: fontFamily.medium, fontSize: fontSizes.base, color: colors.textPrimary },
  hiddenInput: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' },
  previewContainer: { marginTop: spacing[6], backgroundColor: '#fff', padding: spacing[4], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  fileInfo: { fontFamily: fontFamily.bold, fontSize: fontSizes.base, color: colors.textPrimary, marginBottom: spacing[4], textAlign: 'right' },
  tableWrapper: { marginBottom: spacing[6] },
  previewTitle: { fontFamily: fontFamily.medium, fontSize: fontSizes.sm, color: colors.textMuted, marginBottom: spacing[2], textAlign: 'right' },
  tableHeader: { flexDirection: 'row', backgroundColor: colors.background, padding: spacing[2], borderRadius: radius.sm, marginBottom: spacing[1] },
  tableRow: { flexDirection: 'row', padding: spacing[2], borderBottomWidth: 1, borderColor: colors.border },
  cell: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSizes.sm, color: colors.textPrimary, textAlign: 'right', paddingHorizontal: spacing[1] },
  actions: { flexDirection: 'row', gap: spacing[3], justifyContent: 'flex-start' },
  importBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing[6], paddingVertical: spacing[3], borderRadius: radius.md, minWidth: 120, alignItems: 'center' },
  importBtnText: { fontFamily: fontFamily.bold, fontSize: fontSizes.base, color: '#fff' },
  cancelBtn: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing[6], paddingVertical: spacing[3], borderRadius: radius.md },
  cancelBtnText: { fontFamily: fontFamily.medium, fontSize: fontSizes.base, color: colors.textPrimary },
  resultsSection: { gap: spacing[4] },
  successCard: { backgroundColor: '#E8F5E9', padding: spacing[6], borderRadius: radius.lg, alignItems: 'center' },
  successTitle: { fontFamily: fontFamily.bold, fontSize: fontSizes.xl, color: colors.success, marginBottom: spacing[2] },
  successText: { fontFamily: fontFamily.medium, fontSize: fontSizes.base, color: colors.textPrimary },
  warningCard: { backgroundColor: '#FFF3E0', padding: spacing[4], borderRadius: radius.lg, alignItems: 'center' },
  warningTitle: { fontFamily: fontFamily.bold, fontSize: fontSizes.lg, color: colors.warning },
  errorCard: { backgroundColor: '#FFEBEE', padding: spacing[4], borderRadius: radius.lg },
  errorTitle: { fontFamily: fontFamily.bold, fontSize: fontSizes.lg, color: '#EF4444', marginBottom: spacing[3], textAlign: 'right' },
  errorList: { gap: spacing[2] },
  errorItem: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[2] },
  errorRow: { fontFamily: fontFamily.bold, fontSize: fontSizes.sm, color: '#EF4444' },
  errorReason: { fontFamily: fontFamily.regular, fontSize: fontSizes.sm, color: colors.textPrimary, flex: 1, textAlign: 'right' },
  errorMore: { fontFamily: fontFamily.medium, fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'right', marginTop: spacing[2] },
  actionBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing[6], paddingVertical: spacing[3], borderRadius: radius.md },
  actionBtnText: { fontFamily: fontFamily.bold, fontSize: fontSizes.base, color: '#fff', textAlign: 'center' },
});
