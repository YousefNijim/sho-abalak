'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { offersApi, couponsApi, businessesApi, uploadsApi } from '@shu/api-client';
import type { Offer, Coupon } from '@shu/api-client';

type Tab = 'offers' | 'coupons';

function Toast({ toast }: { toast: { type: string; message: string } | null }) {
  if (!toast) return null;
  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg text-white font-bold text-sm ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
      {toast.message}
    </div>
  );
}

export default function OffersPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('offers');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="space-y-6">
      <Toast toast={toast} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">العروض والكوبونات</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {([['offers', '🏷️ العروض'], ['coupons', '🎟️ الكوبونات']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${tab === key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'offers' ? (
        <OffersTab showToast={showToast} qc={qc} />
      ) : (
        <CouponsTab showToast={showToast} qc={qc} />
      )}
    </div>
  );
}

// ─── Offers Tab ──────────────────────────────────────────────────────────────

function OffersTab({ showToast, qc }: { showToast: (t: 'success' | 'error', m: string) => void; qc: any }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editOffer, setEditOffer] = useState<Offer | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Offer | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const emptyForm = { title: '', description: '', rules: '', imageUrl: '', type: 'INDIVIDUAL' as 'INDIVIDUAL' | 'SHARED', businessIds: [] as string[], offerProducts: [] as { productId?: string; categoryName?: string; discountPct: number }[] };
  const [form, setForm] = useState(emptyForm);

  const { data: offers = [], isLoading } = useQuery({ queryKey: ['admin-offers'], queryFn: () => offersApi.list(false) });
  const { data: businesses = [] } = useQuery({ queryKey: ['businesses-all'], queryFn: () => businessesApi.list({}) });

  const createMutation = useMutation({
    mutationFn: (snapshot: typeof emptyForm) => offersApi.create({ ...snapshot, businessIds: snapshot.businessIds }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-offers'] }); setShowCreate(false); setForm(emptyForm); setPreviewUrl(null); setSelectedFile(null); showToast('success', 'تم إنشاء العرض بنجاح'); },
    onError: () => showToast('error', 'فشل إنشاء العرض'),
  });

  const updateMutation = useMutation({
    mutationFn: (snapshot: typeof emptyForm) => offersApi.update(editOffer!.id, { ...snapshot }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-offers'] }); setEditOffer(null); showToast('success', 'تم تحديث العرض'); },
    onError: () => showToast('error', 'فشل تحديث العرض'),
  });

  const toggleMutation = useMutation({
    mutationFn: (o: Offer) => offersApi.update(o.id, { isActive: !o.isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-offers'] }); showToast('success', 'تم التحديث'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => offersApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-offers'] }); setConfirmDelete(null); showToast('success', 'تم حذف العرض'); },
    onError: () => showToast('error', 'فشل الحذف'),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const result = await uploadsApi.uploadImage(selectedFile);
      // Cloudinary always returns a full https:// URL
      const url = result.url;
      setForm((f) => ({ ...f, imageUrl: url }));
      setPreviewUrl(url);
      showToast('success', 'تم رفع الصورة بنجاح ✓');
    } catch {
      showToast('error', 'فشل رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  const openEdit = (o: Offer) => {
    setEditOffer(o);
    setForm({
      title: o.title,
      description: o.description ?? '',
      rules: o.rules ?? '',
      imageUrl: o.imageUrl ?? '',
      type: o.type,
      businessIds: o.offerBusinesses.map((ob) => ob.businessId),
      offerProducts: o.offerProducts.map((op) => ({ productId: op.productId ?? undefined, categoryName: op.categoryName ?? undefined, discountPct: Number(op.discountPct) })),
    });
    setPreviewUrl(o.imageUrl);
  };

  const OfferForm = ({ onSubmit, label }: { onSubmit: () => void; label: string }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">عنوان العرض *</label>
          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm text-right" placeholder="مثال: خصم 40% على وجبة العائلة" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">نوع العرض</label>
          <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as any }))} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="INDIVIDUAL">فردي (منشأة واحدة)</option>
            <option value="SHARED">مشترك (أكثر من منشأة)</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
        <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm text-right" rows={2} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">الشروط والأحكام (كل شرط في سطر)</label>
        <textarea value={form.rules} onChange={(e) => setForm((f) => ({ ...f, rules: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm text-right" rows={3} placeholder="شرط 1&#10;شرط 2&#10;شرط 3" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">صورة العرض</label>
        {previewUrl && <img src={previewUrl} className="h-28 rounded-lg object-cover mb-2" />}
        <div className="flex gap-2">
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">اختر صورة</button>
          {selectedFile && <button type="button" onClick={handleUpload} disabled={uploading} className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm disabled:opacity-50">{uploading ? 'جاري الرفع...' : 'رفع الصورة'}</button>}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">المنشآت المشاركة</label>
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-lg p-2">
          {(businesses as any[]).map((b: any) => (
            <label key={b.id} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.businessIds.includes(b.id)} onChange={(e) => setForm((f) => ({ ...f, businessIds: e.target.checked ? [...f.businessIds, b.id] : f.businessIds.filter((id) => id !== b.id) }))} />
              <span className="text-sm">{b.name}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">المنتجات والخصومات</label>
          <button type="button" onClick={() => setForm((f) => ({ ...f, offerProducts: [...f.offerProducts, { discountPct: 10 }] }))} className="text-xs text-primary underline">+ إضافة</button>
        </div>
        {form.offerProducts.map((op, i) => (
          <div key={i} className="flex gap-2 items-center mb-2 p-2 border rounded-lg">
            <button type="button" onClick={() => setForm((f) => ({ ...f, offerProducts: f.offerProducts.filter((_, j) => j !== i) }))} className="text-red-500 text-xs font-bold">✕</button>
            <input value={op.categoryName ?? ''} onChange={(e) => setForm((f) => { const ops = [...f.offerProducts]; ops[i] = { ...ops[i], categoryName: e.target.value || undefined }; return { ...f, offerProducts: ops }; })} placeholder="اسم الفئة (اختياري)" className="flex-1 border rounded px-2 py-1 text-sm text-right" />
            <span className="text-sm text-gray-500">أو معرّف المنتج:</span>
            <input value={op.productId ?? ''} onChange={(e) => setForm((f) => { const ops = [...f.offerProducts]; ops[i] = { ...ops[i], productId: e.target.value || undefined }; return { ...f, offerProducts: ops }; })} placeholder="Product ID" className="w-40 border rounded px-2 py-1 text-sm" />
            <span className="text-sm">خصم</span>
            <input type="number" value={op.discountPct} min={1} max={100} onChange={(e) => setForm((f) => { const ops = [...f.offerProducts]; ops[i] = { ...ops[i], discountPct: Number(e.target.value) }; return { ...f, offerProducts: ops }; })} className="w-16 border rounded px-2 py-1 text-sm" />
            <span className="text-sm">%</span>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={() => { setShowCreate(false); setEditOffer(null); setForm(emptyForm); }} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">إلغاء</button>
        <button type="button" onClick={onSubmit} disabled={!form.title || form.businessIds.length === 0} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold disabled:opacity-50">{label}</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setForm(emptyForm); setPreviewUrl(null); setShowCreate(true); }} className="bg-primary text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-base">add</span> إضافة عرض جديد
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">إضافة عرض جديد</h2>
            <OfferForm onSubmit={() => createMutation.mutate(form)} label={createMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء العرض'} />
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editOffer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">تعديل العرض</h2>
            <OfferForm onSubmit={() => updateMutation.mutate(form)} label={updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'} />
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-2">تأكيد الحذف</h3>
            <p className="text-gray-600 text-sm mb-4">هل تريد حذف العرض "{confirmDelete.title}"؟</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 border rounded-xl py-2 text-sm">إلغاء</button>
              <button onClick={() => deleteMutation.mutate(confirmDelete.id)} disabled={deleteMutation.isPending} className="flex-1 bg-red-500 text-white rounded-xl py-2 text-sm font-bold">{deleteMutation.isPending ? '...' : 'حذف'}</button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? <div className="text-center py-12 text-gray-400">جاري التحميل...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(offers as Offer[]).map((offer) => (
            <div key={offer.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              {offer.imageUrl && <img src={offer.imageUrl} className="w-full h-40 object-cover" />}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${offer.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{offer.isActive ? 'نشط' : 'متوقف'}</span>
                  <div className="text-right">
                    <p className="font-bold text-sm">{offer.title}</p>
                    <p className="text-xs text-gray-500">{offer.type === 'SHARED' ? `${offer.offerBusinesses.length} منشآت` : offer.offerBusinesses[0]?.business?.name ?? '—'}</p>
                  </div>
                </div>
                {offer.offerProducts.length > 0 && (
                  <div className="text-xs text-gray-500 text-right mb-3">
                    {offer.offerProducts.map((op, i) => <span key={i} className="inline-block bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full mr-1">{op.categoryName ?? op.product?.name ?? 'منتج'} -{Number(op.discountPct)}%</span>)}
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => toggleMutation.mutate(offer)} className={`flex-1 text-xs py-1.5 rounded-lg font-bold ${offer.isActive ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>{offer.isActive ? 'إيقاف' : 'تفعيل'}</button>
                  <button onClick={() => openEdit(offer)} className="flex-1 text-xs py-1.5 rounded-lg bg-blue-50 text-blue-600 font-bold">تعديل</button>
                  <button onClick={() => setConfirmDelete(offer)} className="flex-1 text-xs py-1.5 rounded-lg bg-red-50 text-red-600 font-bold">حذف</button>
                </div>
              </div>
            </div>
          ))}
          {offers.length === 0 && <div className="col-span-3 text-center py-12 text-gray-400">لا توجد عروض بعد</div>}
        </div>
      )}
    </div>
  );
}

// ─── Coupons Tab ─────────────────────────────────────────────────────────────

function CouponsTab({ showToast, qc }: { showToast: (t: 'success' | 'error', m: string) => void; qc: any }) {
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Coupon | null>(null);
  const [form, setForm] = useState({ code: '', discountAmount: '', minimumOrder: '' });

  const { data: coupons = [], isLoading } = useQuery({ queryKey: ['admin-coupons'], queryFn: () => couponsApi.list() });

  const createMutation = useMutation({
    mutationFn: () => couponsApi.create({ code: form.code.toUpperCase(), discountAmount: Number(form.discountAmount), minimumOrder: Number(form.minimumOrder) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-coupons'] }); setShowCreate(false); setForm({ code: '', discountAmount: '', minimumOrder: '' }); showToast('success', 'تم إنشاء الكوبون'); },
    onError: (err: any) => showToast('error', err?.response?.data?.message || 'فشل إنشاء الكوبون'),
  });

  const toggleMutation = useMutation({
    mutationFn: (c: Coupon) => couponsApi.update(c.id, { isActive: !c.isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-coupons'] }); showToast('success', 'تم التحديث'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => couponsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-coupons'] }); setConfirmDelete(null); showToast('success', 'تم حذف الكوبون'); },
    onError: () => showToast('error', 'فشل الحذف'),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowCreate(true)} className="bg-primary text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-base">add</span> إضافة كوبون جديد
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">إضافة كوبون جديد</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">كود الكوبون *</label>
                <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} className="w-full border rounded-lg px-3 py-2 text-sm font-mono tracking-wider" placeholder="مثال: SAVE20" />
                <p className="text-xs text-gray-400 mt-1">كود من حروف وأرقام — سيتم تحويله لأحرف كبيرة</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">قيمة الخصم (₪) *</label>
                <input type="number" min={0.01} step={0.01} value={form.discountAmount} onChange={(e) => setForm((f) => ({ ...f, discountAmount: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="مثال: 10" />
                <p className="text-xs text-gray-400 mt-1">يُطرح من إجمالي المنتجات قبل إضافة رسوم التوصيل</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الحد الأدنى للطلب (₪) *</label>
                <input type="number" min={0} step={0.01} value={form.minimumOrder} onChange={(e) => setForm((f) => ({ ...f, minimumOrder: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="مثال: 50" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 border rounded-xl py-2 text-sm">إلغاء</button>
                <button onClick={() => createMutation.mutate()} disabled={!form.code || !form.discountAmount || !form.minimumOrder || createMutation.isPending} className="flex-1 bg-primary text-white rounded-xl py-2 text-sm font-bold disabled:opacity-50">
                  {createMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء الكوبون'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-2">تأكيد الحذف</h3>
            <p className="text-gray-600 text-sm mb-4">هل تريد حذف الكوبون <span className="font-mono font-bold">{confirmDelete.code}</span>؟</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 border rounded-xl py-2 text-sm">إلغاء</button>
              <button onClick={() => deleteMutation.mutate(confirmDelete.id)} disabled={deleteMutation.isPending} className="flex-1 bg-red-500 text-white rounded-xl py-2 text-sm font-bold">{deleteMutation.isPending ? '...' : 'حذف'}</button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? <div className="text-center py-12 text-gray-400">جاري التحميل...</div> : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">الكود</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">قيمة الخصم</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">الحد الأدنى</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">الحالة</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">مستخدم</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(coupons as Coupon[]).map((c) => (
                <tr key={c.id} className="bg-white hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-bold text-primary">{c.code}</td>
                  <td className="px-4 py-3 font-bold text-green-600">{c.discountAmount} ₪</td>
                  <td className="px-4 py-3 text-gray-600">{c.minimumOrder} ₪</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${c.isActive && !c.usedAt ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.usedAt ? 'مستخدم' : c.isActive ? 'نشط' : 'متوقف'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{c.usedAt ? new Date(c.usedAt).toLocaleDateString('ar-EG') : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {!c.usedAt && (
                        <button onClick={() => toggleMutation.mutate(c)} className={`text-xs px-2 py-1 rounded-lg font-bold ${c.isActive ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>{c.isActive ? 'إيقاف' : 'تفعيل'}</button>
                      )}
                      <button onClick={() => setConfirmDelete(c)} className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 font-bold">حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-gray-400">لا توجد كوبونات</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
