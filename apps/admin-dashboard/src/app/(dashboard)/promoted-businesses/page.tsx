'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promotedBusinessesApi, businessesApi, areasApi, BASE_URL } from '@shu/api-client';
import type { PromotedBusiness } from '@shu/api-client';

export default function PromotedBusinessesPage() {
  const qc = useQueryClient();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PromotedBusiness | null>(null);

  const [newPromo, setNewPromo] = useState<{
    businessId: string;
    areaId: string;
    isPopup: boolean;
    isActive: boolean;
    priority: number;
  }>({
    businessId: '',
    areaId: '',
    isPopup: false,
    isActive: true,
    priority: 0,
  });

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['promoted-businesses', 'admin'],
    queryFn: () => promotedBusinessesApi.listAdmin(),
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => businessesApi.list(),
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: () => areasApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      promotedBusinessesApi.create({
        businessId: newPromo.businessId,
        areaId: newPromo.areaId || undefined,
        isPopup: newPromo.isPopup,
        isActive: newPromo.isActive,
        priority: newPromo.priority,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promoted-businesses'] });
      showToast('success', 'تمت إضافة المنشأة المميزة بنجاح');
      setIsAddModalOpen(false);
      setNewPromo({ businessId: '', areaId: '', isPopup: false, isActive: true, priority: 0 });
    },
    onError: (err: any) => {
      showToast('error', err.response?.data?.message || err.message || 'فشل إضافة المنشأة المميزة');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      promotedBusinessesApi.update(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promoted-businesses'] });
      showToast('success', 'تم التحديث بنجاح');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => promotedBusinessesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promoted-businesses'] });
      showToast('success', 'تم الحذف بنجاح');
      setConfirmDelete(null);
    },
  });

  const getMediaUrl = (path: string | null | undefined) => {
    if (!path) return '';
    return path.startsWith('http') ? path : `${BASE_URL}${path}`;
  };

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
          <h2 className="text-2xl font-bold text-on-surface">المنشآت المميزة (الممولة)</h2>
          <p className="text-[12px] text-muted-gray mt-0.5">تظهر هذه المنشآت أولاً في قائمة المطاعم والمتاجر</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex h-12 items-center gap-2 rounded-xl bg-primary px-5 font-bold text-white shadow-md transition-all hover:bg-primary/90"
        >
          <span className="material-symbols-outlined">hotel_class</span>
          إضافة تمويل جديد
        </button>
      </div>

      <div className="rounded-xl border border-border-beige bg-white shadow-sm overflow-hidden" dir="rtl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-[13px] text-on-surface">
            <thead className="bg-surface-container-low text-muted-gray border-b border-border-beige">
              <tr>
                <th className="px-6 py-4 font-bold">المنشأة</th>
                <th className="px-6 py-4 font-bold">المنطقة</th>
                <th className="px-6 py-4 font-bold">الأولوية</th>
                <th className="px-6 py-4 font-bold">إعلان منبثق؟</th>
                <th className="px-6 py-4 font-bold">الحالة</th>
                <th className="px-6 py-4 font-bold text-left">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </td>
                </tr>
              ) : promotions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-gray">
                    <span className="material-symbols-outlined text-[32px] mb-2">sentiment_dissatisfied</span>
                    <p>لا توجد منشآت مميزة حالياً</p>
                  </td>
                </tr>
              ) : (
                promotions.map((promo) => (
                  <tr key={promo.id} className="border-b border-border-beige last:border-0 hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={getMediaUrl(promo.business.imageUrl) || 'https://placehold.co/100?text=Logo'}
                          alt={promo.business.name}
                          className="h-10 w-10 rounded-lg object-cover bg-border-beige"
                        />
                        <span className="font-bold">{promo.business.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-gray">
                      {promo.area ? promo.area.name : <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] text-primary">جميع المناطق</span>}
                    </td>
                    <td className="px-6 py-4 font-bold text-secondary">
                      {promo.priority}
                    </td>
                    <td className="px-6 py-4">
                      {promo.isPopup ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-1 text-[11px] font-bold text-purple-700">
                          <span className="material-symbols-outlined text-[14px]">picture_in_picture</span>
                          نعم
                        </span>
                      ) : (
                        <span className="text-muted-gray">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActiveMutation.mutate({ id: promo.id, isActive: !promo.isActive })}
                        className={`flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-bold transition-colors ${
                          promo.isActive ? 'bg-success/10 text-success' : 'bg-surface-container-low text-muted-gray'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {promo.isActive ? 'check_circle' : 'cancel'}
                        </span>
                        {promo.isActive ? 'نشط' : 'متوقف'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-left">
                      <button
                        onClick={() => setConfirmDelete(promo)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-error/20 bg-error/5 text-error transition-all hover:bg-error hover:text-white mr-auto"
                        title="حذف"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !createMutation.isPending && setIsAddModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200" dir="rtl">
            <div className="flex items-center justify-between border-b border-border-beige pb-3">
              <h3 className="text-lg font-bold text-on-surface">إضافة منشأة مميزة</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-gray hover:bg-surface-container-low hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-on-surface mb-1.5">المنشأة *</label>
                <select
                  value={newPromo.businessId}
                  onChange={(e) => setNewPromo({ ...newPromo, businessId: e.target.value })}
                  className="h-11 w-full rounded-lg border border-border-beige px-3 text-[13px] focus:border-primary focus:outline-none bg-white"
                >
                  <option value="" disabled>اختر المنشأة...</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-on-surface mb-1.5">المنطقة (اختياري)</label>
                <select
                  value={newPromo.areaId}
                  onChange={(e) => setNewPromo({ ...newPromo, areaId: e.target.value })}
                  className="h-11 w-full rounded-lg border border-border-beige px-3 text-[13px] focus:border-primary focus:outline-none bg-white"
                >
                  <option value="">جميع المناطق (تظهر للكل)</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-on-surface mb-1.5">الأولوية (رقم أعلى = يظهر أولاً)</label>
                <input
                  type="number"
                  value={newPromo.priority}
                  onChange={(e) => setNewPromo({ ...newPromo, priority: Number(e.target.value) })}
                  className="h-11 w-full rounded-lg border border-border-beige px-3 text-[13px] focus:border-primary focus:outline-none"
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={newPromo.isPopup}
                    onChange={(e) => setNewPromo({ ...newPromo, isPopup: e.target.checked })}
                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-[13px] font-bold text-on-surface">إظهار كإعلان منبثق أيضاً (Pop-up)</span>
                </label>
                
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={newPromo.isActive}
                    onChange={(e) => setNewPromo({ ...newPromo, isActive: e.target.checked })}
                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-[13px] font-bold text-on-surface">نشط حالياً</span>
                </label>
              </div>
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
                disabled={!newPromo.businessId || createMutation.isPending}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-[13px] font-bold text-white shadow-md hover:bg-primary/95 transition-all disabled:opacity-50"
              >
                {createMutation.isPending && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                حفظ التمويل
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
              <h3 className="mt-4 text-[16px] font-bold text-on-surface">إلغاء التمويل؟</h3>
              <p className="mt-2 text-[12px] text-muted-gray">سيتم إزالة تمييز هذه المنشأة من قائمة المطاعم.</p>
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
