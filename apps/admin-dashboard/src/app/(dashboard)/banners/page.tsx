'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bannersApi, uploadsApi } from '@shu/api-client';
import type { Banner } from '@shu/api-client';

export default function BannersPage() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Banner | null>(null);

  const [newBanner, setNewBanner] = useState<{ linkUrl: string; isActive: boolean }>({ linkUrl: '', isActive: true });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['banners'],
    queryFn: () => bannersApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('يرجى اختيار صورة');
      // 1. Upload image
      const { url } = await uploadsApi.uploadImage(selectedFile);
      // 2. Create banner
      return bannersApi.create({
        imageUrl: url,
        linkUrl: newBanner.linkUrl.trim() || undefined,
        isActive: newBanner.isActive,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banners'] });
      showToast('success', 'تمت إضافة الإعلان بنجاح');
      setIsAddModalOpen(false);
      setNewBanner({ linkUrl: '', isActive: true });
      setSelectedFile(null);
      setPreviewUrl(null);
    },
    onError: (err: any) => {
      showToast('error', err.response?.data?.message || err.message || 'فشل إضافة الإعلان');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      bannersApi.update(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banners'] });
      showToast('success', 'تم تحديث حالة الإعلان');
    },
    onError: () => showToast('error', 'فشل تحديث حالة الإعلان'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bannersApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banners'] });
      showToast('success', 'تم حذف الإعلان بنجاح');
      setConfirmDelete(null);
    },
    onError: () => showToast('error', 'فشل حذف الإعلان'),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const getMediaUrl = (path: string) => (path.startsWith('http') ? path : `http://127.0.0.1:3001${path}`);

  return (
    <>
      {toast && (
        <div
          className={`fixed top-4 left-4 z-50 flex items-center gap-3 rounded-xl px-5 py-3.5 text-white shadow-lg animate-bounce`}
          style={{ backgroundColor: toast.type === 'success' ? '#165A34' : '#EF4444' }}
          dir="rtl"
        >
          <span className="material-symbols-outlined">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="text-[13px] font-bold">{toast.message}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-gap-md mb-6" dir="rtl">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">إدارة الإعلانات (Banners)</h2>
          <p className="text-[12px] text-muted-gray mt-0.5">إدارة الصور المتحركة في الشاشة الرئيسية لتطبيق الزبون</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex h-12 items-center gap-gap-sm rounded-xl bg-primary px-5 font-bold text-white shadow-md transition-all hover:bg-primary/90"
        >
          <span className="material-symbols-outlined">add_photo_alternate</span>
          إضافة إعلان جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" dir="rtl">
        {isLoading ? (
          <div className="col-span-full flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : banners.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-muted-gray bg-white rounded-xl border border-border-beige">
            <span className="material-symbols-outlined text-[48px] mb-4">hide_image</span>
            <p>لا توجد إعلانات مضافة حالياً</p>
          </div>
        ) : (
          banners.map((banner) => (
            <div key={banner.id} className="flex flex-col overflow-hidden rounded-xl border border-border-beige bg-white shadow-sm transition-all hover:shadow-md">
              <div className="relative aspect-[21/9] w-full bg-surface-container-low">
                <img src={getMediaUrl(banner.imageUrl)} alt="Banner" className="h-full w-full object-cover" />
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={() => toggleActiveMutation.mutate({ id: banner.id, isActive: !banner.isActive })}
                    className={`flex h-8 items-center gap-1 rounded-lg px-3 text-[12px] font-bold shadow-sm backdrop-blur-md transition-colors ${
                      banner.isActive ? 'bg-success/90 text-white' : 'bg-surface-container-low text-muted-gray'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {banner.isActive ? 'visibility' : 'visibility_off'}
                    </span>
                    {banner.isActive ? 'نشط' : 'مخفي'}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between p-4">
                <div className="flex-1 truncate">
                  {banner.linkUrl ? (
                    <a href={banner.linkUrl} target="_blank" rel="noreferrer" className="text-[13px] text-secondary hover:underline truncate">
                      {banner.linkUrl}
                    </a>
                  ) : (
                    <span className="text-[13px] text-muted-gray">لا يوجد رابط</span>
                  )}
                </div>
                <button
                  onClick={() => setConfirmDelete(banner)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-error/20 bg-error/5 text-error transition-all hover:bg-error hover:text-white"
                  title="حذف الإعلان"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !createMutation.isPending && setIsAddModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200" dir="rtl">
            <div className="flex items-center justify-between border-b border-border-beige pb-3">
              <h3 className="text-lg font-bold text-on-surface">إضافة إعلان جديد</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-gray hover:bg-surface-container-low hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-on-surface mb-1.5">صورة الإعلان (نسبة العرض للارتفاع يفضل أن تكون 21:9)</label>
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

              <div>
                <label className="block text-[12px] font-bold text-on-surface mb-1.5">رابط التوجيه (اختياري)</label>
                <input
                  type="text"
                  value={newBanner.linkUrl}
                  onChange={(e) => setNewBanner({ ...newBanner, linkUrl: e.target.value })}
                  placeholder="https://..."
                  className="h-11 w-full rounded-lg border border-border-beige px-3 text-[13px] text-on-surface placeholder:text-muted-gray focus:border-primary focus:outline-none"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={newBanner.isActive}
                  onChange={(e) => setNewBanner({ ...newBanner, isActive: e.target.checked })}
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
                حفظ ورفع
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
              <h3 className="mt-4 text-[16px] font-bold text-on-surface">هل أنت متأكد من حذف هذا الإعلان؟</h3>
              <p className="mt-2 text-[12px] text-muted-gray leading-relaxed">
                لا يمكن التراجع عن هذا الإجراء. سيتم إخفاء الصورة من تطبيق الزبون.
              </p>
            </div>
            <div className="mt-6 flex justify-center gap-3 border-t border-border-beige pt-4">
              <button
                onClick={() => setConfirmDelete(null)}
                className="h-11 flex-1 rounded-xl border border-border-beige bg-white text-[13px] font-bold text-on-surface hover:bg-surface-container-low transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => deleteMutation.mutate(confirmDelete.id)}
                disabled={deleteMutation.isPending}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-error text-[13px] font-bold text-white shadow-md hover:bg-error/90 transition-all disabled:opacity-50"
              >
                {deleteMutation.isPending && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
