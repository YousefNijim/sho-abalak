'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { popupAdsApi, uploadsApi, BASE_URL } from '@shu/api-client';
import type { PopupAd } from '@shu/api-client';

const TARGET_PAGES = [
  { value: 'home', label: 'الرئيسية' },
  { value: 'cart', label: 'السلة' },
  { value: 'orders', label: 'الطلبات' },
  { value: 'all', label: 'جميع الصفحات' },
];

export default function PopupAdsPage() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PopupAd | null>(null);

  const [newAd, setNewAd] = useState<{
    title: string;
    buttonText: string;
    buttonUrl: string;
    targetPage: string;
    isActive: boolean;
    intervalHours: number;
  }>({
    title: '',
    buttonText: '',
    buttonUrl: '',
    targetPage: 'home',
    isActive: true,
    intervalHours: 24, // default once per day
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const { data: ads = [], isLoading } = useQuery({
    queryKey: ['popup-ads', 'admin'],
    queryFn: () => popupAdsApi.listAdmin(),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('يرجى اختيار صورة');
      const { url } = await uploadsApi.uploadImage(selectedFile);
      return popupAdsApi.create({
        imageUrl: url,
        title: newAd.title.trim() || undefined,
        buttonText: newAd.buttonText.trim() || undefined,
        buttonUrl: newAd.buttonUrl.trim() || undefined,
        targetPage: newAd.targetPage,
        isActive: newAd.isActive,
        intervalHours: newAd.intervalHours,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['popup-ads'] });
      showToast('success', 'تمت إضافة الإعلان بنجاح');
      setIsAddModalOpen(false);
      setNewAd({ title: '', buttonText: '', buttonUrl: '', targetPage: 'home', isActive: true, intervalHours: 24 });
      setSelectedFile(null);
      setPreviewUrl(null);
    },
    onError: (err: any) => {
      showToast('error', err.response?.data?.message || err.message || 'فشل إضافة الإعلان');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      popupAdsApi.update(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['popup-ads'] });
      showToast('success', 'تم تحديث حالة الإعلان');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => popupAdsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['popup-ads'] });
      showToast('success', 'تم حذف الإعلان بنجاح');
      setConfirmDelete(null);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const getMediaUrl = (path: string) => (path.startsWith('http') ? path : `${BASE_URL}${path}`);

  return (
    <>
      {toast && (
        <div
          className="fixed top-4 left-4 z-50 flex items-center gap-3 rounded-xl px-5 py-3.5 text-white shadow-lg animate-bounce"
          style={{ backgroundColor: toast.type === 'success' ? '#165A34' : '#EF4444' }}
          dir="rtl"
        >
          <span className="material-symbols-outlined">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="text-[13px] font-bold">{toast.message}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6" dir="rtl">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">الإعلانات المنبثقة (Popup Ads)</h2>
          <p className="text-[12px] text-muted-gray mt-0.5">إدارة الإعلانات التي تظهر للمستخدم عند فتح التطبيق</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex h-12 items-center gap-2 rounded-xl bg-primary px-5 font-bold text-white shadow-md transition-all hover:bg-primary/90"
        >
          <span className="material-symbols-outlined">add_photo_alternate</span>
          إضافة إعلان جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" dir="rtl">
        {isLoading ? (
          <div className="col-span-full flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : ads.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-muted-gray bg-white rounded-xl border border-border-beige">
            <span className="material-symbols-outlined text-[48px] mb-4">picture_in_picture</span>
            <p>لا توجد إعلانات منبثقة مضافة حالياً</p>
          </div>
        ) : (
          ads.map((ad) => (
            <div key={ad.id} className="flex flex-col overflow-hidden rounded-xl border border-border-beige bg-white shadow-sm transition-all hover:shadow-md">
              <div className="relative aspect-square w-full bg-surface-container-low">
                <img src={getMediaUrl(ad.imageUrl)} alt="Popup Ad" className="h-full w-full object-cover" />
                <div className="absolute top-2 right-2 flex flex-col gap-2">
                  <button
                    onClick={() => toggleActiveMutation.mutate({ id: ad.id, isActive: !ad.isActive })}
                    className={`flex h-8 items-center gap-1 rounded-lg px-3 text-[12px] font-bold shadow-sm backdrop-blur-md transition-colors ${
                      ad.isActive ? 'bg-success/90 text-white' : 'bg-surface-container-low text-muted-gray'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {ad.isActive ? 'visibility' : 'visibility_off'}
                    </span>
                    {ad.isActive ? 'نشط' : 'مخفي'}
                  </button>
                  <div className="flex h-8 items-center justify-center rounded-lg bg-black/60 px-3 text-[12px] font-bold text-white backdrop-blur-md">
                    {TARGET_PAGES.find((p) => p.value === ad.targetPage)?.label || ad.targetPage}
                  </div>
                </div>
              </div>
              <div className="flex flex-col p-4">
                <div className="mb-2">
                  <h4 className="font-bold text-on-surface truncate">{ad.title || 'بدون عنوان'}</h4>
                  <p className="text-[12px] text-muted-gray">
                    {ad.intervalHours === 0 ? 'يظهر دائماً' : `مرة كل ${ad.intervalHours} ساعة`}
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-border-beige pt-3 mt-1">
                  <div className="flex-1 truncate">
                    {ad.buttonUrl ? (
                      <a href={ad.buttonUrl} target="_blank" rel="noreferrer" className="text-[12px] text-secondary hover:underline truncate">
                        {ad.buttonText || 'رابط'}
                      </a>
                    ) : (
                      <span className="text-[12px] text-muted-gray">لا يوجد رابط</span>
                    )}
                  </div>
                  <button
                    onClick={() => setConfirmDelete(ad)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-error/20 bg-error/5 text-error transition-all hover:bg-error hover:text-white"
                    title="حذف"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !createMutation.isPending && setIsAddModalOpen(false)} />
          <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200" dir="rtl">
            <div className="flex items-center justify-between border-b border-border-beige pb-3">
              <h3 className="text-lg font-bold text-on-surface">إضافة إعلان منبثق</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-gray hover:bg-surface-container-low hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-on-surface mb-1.5">صورة الإعلان *</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-6 transition-all hover:bg-primary/10"
                >
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="max-h-32 rounded-lg object-contain" />
                  ) : (
                    <>
                      <span className="material-symbols-outlined mb-2 text-[32px] text-primary">add_photo_alternate</span>
                      <span className="text-[13px] font-bold text-primary">اضغط لاختيار صورة</span>
                    </>
                  )}
                  <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-on-surface mb-1.5">عنوان النص (اختياري)</label>
                  <input
                    type="text"
                    value={newAd.title}
                    onChange={(e) => setNewAd({ ...newAd, title: e.target.value })}
                    className="h-11 w-full rounded-lg border border-border-beige px-3 text-[13px] focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-on-surface mb-1.5">صفحة العرض</label>
                  <select
                    value={newAd.targetPage}
                    onChange={(e) => setNewAd({ ...newAd, targetPage: e.target.value })}
                    className="h-11 w-full rounded-lg border border-border-beige px-3 text-[13px] focus:border-primary focus:outline-none bg-white"
                  >
                    {TARGET_PAGES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-on-surface mb-1.5">نص الزر (اختياري)</label>
                  <input
                    type="text"
                    value={newAd.buttonText}
                    onChange={(e) => setNewAd({ ...newAd, buttonText: e.target.value })}
                    placeholder="مثال: تسوق الآن"
                    className="h-11 w-full rounded-lg border border-border-beige px-3 text-[13px] focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-on-surface mb-1.5">رابط الزر (اختياري)</label>
                  <input
                    type="text"
                    value={newAd.buttonUrl}
                    onChange={(e) => setNewAd({ ...newAd, buttonUrl: e.target.value })}
                    placeholder="https://..."
                    className="h-11 w-full rounded-lg border border-border-beige px-3 text-[13px] focus:border-primary focus:outline-none text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-on-surface mb-1.5">معدل الظهور للمستخدم</label>
                <select
                  value={newAd.intervalHours}
                  onChange={(e) => setNewAd({ ...newAd, intervalHours: Number(e.target.value) })}
                  className="h-11 w-full rounded-lg border border-border-beige px-3 text-[13px] focus:border-primary focus:outline-none bg-white"
                >
                  <option value={0}>في كل مرة يفتح فيها الصفحة</option>
                  <option value={1}>مرة كل ساعة</option>
                  <option value={12}>مرة كل 12 ساعة</option>
                  <option value={24}>مرة واحدة يومياً</option>
                </select>
              </div>

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={newAd.isActive}
                  onChange={(e) => setNewAd({ ...newAd, isActive: e.target.checked })}
                  className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-[13px] font-bold text-on-surface">إعلان نشط (يظهر فوراً)</span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-border-beige pt-4">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="h-11 rounded-xl border border-border-beige bg-white px-5 text-[13px] font-bold text-on-surface hover:bg-surface-container-low transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!selectedFile || createMutation.isPending}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-[13px] font-bold text-white shadow-md hover:bg-primary/95 transition-all disabled:opacity-50"
              >
                {createMutation.isPending && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                إضافة الإعلان
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmDelete(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200" dir="rtl">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error/10 text-error">
                <span className="material-symbols-outlined text-[28px]">delete_forever</span>
              </div>
              <h3 className="mt-4 text-[16px] font-bold text-on-surface">حذف الإعلان المنبثق؟</h3>
              <p className="mt-2 text-[12px] text-muted-gray">لا يمكن التراجع عن هذا الإجراء.</p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="h-11 flex-1 rounded-xl border border-border-beige bg-white text-[13px] font-bold text-on-surface"
              >
                إلغاء
              </button>
              <button
                onClick={() => deleteMutation.mutate(confirmDelete.id)}
                className="h-11 flex-1 rounded-xl bg-error text-[13px] font-bold text-white"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
