'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagsApi, uploadsApi } from '@shu/api-client';
import type { Tag, BusinessType } from '@shu/api-client';

export default function TagsPage() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Tag | null>(null);

  const [formData, setFormData] = useState<{ name: string; type: BusinessType }>({ name: '', type: 'FOOD' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      let imageUrl: string | undefined;
      if (selectedFile) {
        const { url } = await uploadsApi.uploadImage(selectedFile);
        imageUrl = url;
      }
      return tagsApi.create({
        name: formData.name.trim(),
        type: formData.type,
        imageUrl,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] });
      showToast('success', 'تم إضافة القسم بنجاح');
      closeModal();
    },
    onError: (err: any) => showToast('error', err.response?.data?.message || 'فشل إضافة القسم'),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingTag) return;
      let imageUrl = editingTag.imageUrl || undefined;
      if (selectedFile) {
        const { url } = await uploadsApi.uploadImage(selectedFile);
        imageUrl = url;
      }
      return tagsApi.update(editingTag.id, {
        name: formData.name.trim(),
        type: formData.type,
        imageUrl,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] });
      showToast('success', 'تم تعديل القسم بنجاح');
      closeModal();
    },
    onError: (err: any) => showToast('error', err.response?.data?.message || 'فشل تعديل القسم'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tagsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] });
      showToast('success', 'تم حذف القسم بنجاح');
      setConfirmDelete(null);
    },
    onError: () => showToast('error', 'فشل حذف القسم. تأكد من عدم وجود منشآت مرتبطة به.'),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingTag(null);
    setFormData({ name: '', type: 'FOOD' });
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openEditModal = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({ name: tag.name, type: tag.type });
    setPreviewUrl(tag.imageUrl ? getMediaUrl(tag.imageUrl) : null);
    setSelectedFile(null);
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
          <h2 className="text-2xl font-bold text-on-surface">إدارة الأقسام والتصنيفات (Tags)</h2>
          <p className="text-[12px] text-muted-gray mt-0.5">ضبط الأقسام وصورها التي تظهر للزبون في الصفحة الرئيسية</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex h-12 items-center gap-gap-sm rounded-xl bg-primary px-5 font-bold text-white shadow-md transition-all hover:bg-primary/90"
        >
          <span className="material-symbols-outlined">add_circle</span>
          إضافة قسم جديد
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4" dir="rtl">
        {isLoading ? (
          <div className="col-span-full flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : tags.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-muted-gray bg-white rounded-xl border border-border-beige">
            <span className="material-symbols-outlined text-[48px] mb-4">category</span>
            <p>لا توجد أقسام مضافة حالياً</p>
          </div>
        ) : (
          tags.map((tag) => (
            <div key={tag.id} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border-beige bg-white shadow-sm hover:shadow-md transition-all relative group">
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEditModal(tag)}
                  className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                </button>
                <button
                  onClick={() => setConfirmDelete(tag)}
                  className="flex h-7 w-7 items-center justify-center rounded bg-error/10 text-error hover:bg-error hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
              <div className="h-16 w-16 rounded-full bg-surface-container-low overflow-hidden flex items-center justify-center border border-border-beige">
                {tag.imageUrl ? (
                  <img src={getMediaUrl(tag.imageUrl)} alt={tag.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-muted-gray text-[24px]">restaurant</span>
                )}
              </div>
              <span className="text-[13px] font-bold text-on-surface text-center mt-1">{tag.name}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${tag.type === 'FOOD' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                {tag.type === 'FOOD' ? 'مأكولات' : 'متاجر'}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Modal */}
      {(isAddModalOpen || editingTag) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200" dir="rtl">
            <div className="flex items-center justify-between border-b border-border-beige pb-3">
              <h3 className="text-lg font-bold text-on-surface">{editingTag ? 'تعديل القسم' : 'إضافة قسم جديد'}</h3>
              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-gray hover:bg-surface-container-low hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex justify-center">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative h-24 w-24 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors flex items-center justify-center"
                >
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className="material-symbols-outlined text-primary text-[24px]">add_a_photo</span>
                      <span className="text-[10px] text-primary font-bold mt-1">صورة القسم</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-on-surface mb-1.5">اسم القسم</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: شاورما، حلويات..."
                  className="h-11 w-full rounded-lg border border-border-beige px-3 text-[13px] text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-on-surface mb-1.5">النوع الرئيسي</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as BusinessType })}
                  className="h-11 w-full rounded-lg border border-border-beige px-3 text-[13px] text-on-surface focus:border-primary focus:outline-none"
                >
                  <option value="FOOD">مأكولات (Food)</option>
                  <option value="STORE">متاجر (Store)</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-border-beige pt-4">
              <button
                onClick={closeModal}
                className="h-11 rounded-xl border border-border-beige bg-white px-5 text-[13px] font-bold text-on-surface hover:bg-surface-container-low transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => (editingTag ? updateMutation.mutate() : createMutation.mutate())}
                disabled={!formData.name.trim() || createMutation.isPending || updateMutation.isPending}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-[13px] font-bold text-white shadow-md hover:bg-primary/95 transition-all disabled:opacity-50"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                حفظ
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
                <span className="material-symbols-outlined text-[28px]">warning</span>
              </div>
              <h3 className="mt-4 text-[16px] font-bold text-on-surface">تأكيد الحذف</h3>
              <p className="mt-2 text-[12px] text-muted-gray leading-relaxed">
                سيتم حذف قسم "{confirmDelete.name}". تأكد من عدم وجود مطاعم أو منتجات مرتبطة به.
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
                حذف نهائي
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
