'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { businessesApi, areasApi, tagsApi } from '@shu/api-client';
import type { Business, Area, Product, Tag, BusinessType } from '@shu/api-client';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';

const TYPE_LABEL: Record<string, string> = {
  FOOD: 'مأكولات',
  STORE: 'متاجر',
};

const TYPE_STYLE: Record<string, string> = {
  FOOD: 'bg-primary/10 text-primary border-primary/20',
  STORE: 'bg-secondary-container/40 text-secondary border-secondary-container',
};

const columnHelper = createColumnHelper<Business>();

export default function BusinessesPage() {
  const qc = useQueryClient();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [villageFilter, setVillageFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected Business for Details Drawer
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);

  // Intervention Confirmation Dialogs state
  const [confirmAction, setConfirmAction] = useState<{
    type: 'isOpen' | 'commission';
    payload: any;
    message: string;
  } | null>(null);

  // Success/Error Toasts
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Approve / set-password / reset-password modal: target a business + a mode
  const [pwModal, setPwModal] = useState<{ business: Business; mode: 'approve' | 'reset' } | null>(null);
  const [pwValue, setPwValue] = useState('');

  // Reject confirmation
  const [rejectTarget, setRejectTarget] = useState<Business | null>(null);

  // Create-store modal
  const [showCreate, setShowCreate] = useState(false);
  const emptyCreate = {
    name: '',
    type: 'FOOD' as BusinessType,
    tagIds: [] as string[],
    deliveryAreaIds: [] as string[],
    ownerName: '',
    phone: '',
    areaId: '',
    password: '',
    addressDetail: '',
  };
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [createError, setCreateError] = useState('');

  // Edit type/tags modal (admin)
  const [editTarget, setEditTarget] = useState<Business | null>(null);
  const [editType, setEditType] = useState<BusinessType>('FOOD');
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [editDeliveryAreaIds, setEditDeliveryAreaIds] = useState<string[]>([]);

  // Queries
  const { data: businesses = [], isLoading: isBusinessesLoading } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => businessesApi.list(),
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: () => areasApi.list(),
  });

  const uniqueCities = useMemo(() => Array.from(new Set(areas.map((a: Area) => a.city))), [areas]);
  const villagesForCity = useMemo(() => areas.filter((a: Area) => a.city === cityFilter), [areas, cityFilter]);

  // Tags for the create modal (depends on the chosen type).
  const { data: createTags = [] } = useQuery({
    queryKey: ['tags', createForm.type],
    queryFn: () => tagsApi.list(createForm.type),
  });

  // Tags for the edit modal.
  const { data: editAvailableTags = [] } = useQuery({
    queryKey: ['tags', editType],
    queryFn: () => tagsApi.list(editType),
    enabled: !!editTarget,
  });

  const { data: selectedBusiness, isLoading: isDetailLoading } = useQuery({
    queryKey: ['business', selectedBusinessId],
    queryFn: () => businessesApi.getById(selectedBusinessId!),
    enabled: !!selectedBusinessId,
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, isOpen }: { id: string; isOpen: boolean }) =>
      businessesApi.adminUpdateStatus(id, isOpen),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['businesses'] });
      if (selectedBusinessId) qc.invalidateQueries({ queryKey: ['business', selectedBusinessId] });
      showToast('success', 'تم تعديل حالة إغلاق/فتح المتجر يدويًا بنجاح');
      setConfirmAction(null);
    },
    onError: (err: any) => {
      showToast('error', err.response?.data?.message || 'فشل تعديل حالة المتجر');
      setConfirmAction(null);
    },
  });

  const updateCommissionMutation = useMutation({
    mutationFn: ({ id, rate }: { id: string; rate: number }) =>
      businessesApi.adminUpdateCommission(id, rate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['businesses'] });
      if (selectedBusinessId) qc.invalidateQueries({ queryKey: ['business', selectedBusinessId] });
      showToast('success', 'تم تعديل نسبة عمولة المنصة للمتجر بنجاح');
      setConfirmAction(null);
    },
    onError: (err: any) => {
      showToast('error', err.response?.data?.message || 'فشل تعديل نسبة العمولة');
      setConfirmAction(null);
    },
  });

  const refetchBusinesses = () => qc.invalidateQueries({ queryKey: ['businesses'] });

  const approveMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      businessesApi.adminApprove(id, password),
    onSuccess: () => {
      refetchBusinesses();
      showToast('success', 'تمت الموافقة على المتجر وتعيين كلمة المرور — يمكنه الآن تسجيل الدخول');
      setPwModal(null);
      setPwValue('');
    },
    onError: (err: any) => showToast('error', err.response?.data?.message || 'فشل الموافقة على المتجر'),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      businessesApi.adminResetPassword(id, password),
    onSuccess: () => {
      showToast('success', 'تم إعادة تعيين كلمة مرور المتجر بنجاح');
      setPwModal(null);
      setPwValue('');
    },
    onError: (err: any) => showToast('error', err.response?.data?.message || 'فشل إعادة تعيين كلمة المرور'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => businessesApi.adminReject(id),
    onSuccess: () => {
      refetchBusinesses();
      showToast('success', 'تم رفض طلب التسجيل وحذفه');
      setRejectTarget(null);
    },
    onError: (err: any) => showToast('error', err.response?.data?.message || 'فشل رفض الطلب'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      businessesApi.adminCreate({
        name: createForm.name.trim(),
        type: createForm.type,
        tagIds: createForm.tagIds,
        ownerName: createForm.ownerName.trim(),
        phone: createForm.phone.trim(),
        areaId: createForm.areaId,
        password: createForm.password,
        addressDetail: createForm.addressDetail.trim() || undefined,
        deliveryAreaIds: createForm.type === 'FOOD' ? createForm.deliveryAreaIds : undefined,
      }),
    onSuccess: () => {
      refetchBusinesses();
      showToast('success', 'تم إنشاء المتجر وتفعيله — يمكنه تسجيل الدخول مباشرة');
      setShowCreate(false);
      setCreateForm(emptyCreate);
      setCreateError('');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'فشل إنشاء المتجر';
      setCreateError(Array.isArray(msg) ? msg.join(' ، ') : String(msg));
    },
  });

  const editMutation = useMutation({
    mutationFn: () => businessesApi.adminUpdate(editTarget!.id, { 
      type: editType, 
      tagIds: editTagIds,
      deliveryAreaIds: editType === 'FOOD' ? editDeliveryAreaIds : undefined
    }),
    onSuccess: () => {
      refetchBusinesses();
      if (selectedBusinessId) qc.invalidateQueries({ queryKey: ['business', selectedBusinessId] });
      showToast('success', 'تم تحديث النوع والتصنيفات بنجاح');
      setEditTarget(null);
    },
    onError: (err: any) => showToast('error', err.response?.data?.message || 'فشل تحديث المتجر'),
  });

  const openEdit = (b: Business) => {
    setEditTarget(b);
    setEditType(b.type);
    setEditTagIds((b.tags ?? []).map((t) => t.id));
    // @ts-ignore
    setEditDeliveryAreaIds((b.deliveryAreas ?? []).map((a: any) => a.id));
  };
  const toggleCreateTag = (id: string) =>
    setCreateForm((f) => ({
      ...f,
      tagIds: f.tagIds.includes(id) ? f.tagIds.filter((t) => t !== id) : [...f.tagIds, id],
    }));
  const toggleCreateDeliveryArea = (id: string) =>
    setCreateForm((f) => ({
      ...f,
      deliveryAreaIds: f.deliveryAreaIds.includes(id) ? f.deliveryAreaIds.filter((a) => a !== id) : [...f.deliveryAreaIds, id],
    }));
  const toggleEditTag = (id: string) =>
    setEditTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  const toggleEditDeliveryArea = (id: string) =>
    setEditDeliveryAreaIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const submitPassword = () => {
    if (!pwModal) return;
    if (pwValue.trim().length < 6) {
      showToast('error', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (pwModal.mode === 'approve') approveMutation.mutate({ id: pwModal.business.id, password: pwValue.trim() });
    else resetPasswordMutation.mutate({ id: pwModal.business.id, password: pwValue.trim() });
  };

  const submitCreate = () => {
    setCreateError('');
    const f = createForm;
    if (!f.name.trim() || !f.ownerName.trim() || !f.phone.trim() || !f.areaId || f.password.length < 6) {
      setCreateError('يرجى تعبئة جميع الحقول (كلمة المرور 6 أحرف على الأقل)');
      return;
    }
    createMutation.mutate();
  };

  // Client side filtering
  const filteredBusinesses = useMemo(() => {
    return businesses.filter((b) => {
      // 1. Type Filter
      if (typeFilter !== 'ALL' && b.type !== typeFilter) return false;

      // 2. Area Filter
      if (cityFilter !== 'ALL' && b.area?.city !== cityFilter) return false;
      if (villageFilter !== 'ALL' && b.areaId !== villageFilter) return false;

      // 3. Status Filter
      if (statusFilter === 'PENDING') {
        if (b.owner?.status !== 'PENDING') return false;
      } else if (statusFilter === 'OPEN' || statusFilter === 'CLOSED') {
        const activeState = statusFilter === 'OPEN';
        if (b.isOpen !== activeState) return false;
      }

      // 4. Text Search
      if (search) {
        const query = search.toLowerCase();
        const bizName = b.name.toLowerCase();
        const shortId = `#${b.id.slice(0, 8)}`.toLowerCase();
        return bizName.includes(query) || shortId.includes(query);
      }

      return true;
    });
  }, [businesses, search, typeFilter, cityFilter, villageFilter, statusFilter]);

  // TanStack columns
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'المنشأة الشريكة',
        cell: (info) => (
          <div className="flex items-center gap-gap-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border-beige bg-background/30 text-primary">
              <span className="material-symbols-outlined text-[24px]">storefront</span>
            </div>
            <div>
              <p className="text-[15px] font-semibold text-on-surface">{info.getValue()}</p>
              <p className="text-[11px] text-muted-gray">ID: #{info.row.original.id.slice(0, 8)}</p>
            </div>
          </div>
        ),
      }),
      columnHelper.accessor('type', {
        header: 'النوع والتصنيفات',
        cell: (info) => {
          const b = info.row.original;
          return (
            <div className="flex flex-col gap-1 items-end">
              <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold border ${TYPE_STYLE[info.getValue()] ?? ''}`}>
                {TYPE_LABEL[info.getValue()] ?? info.getValue()}
              </span>
              {b.tags && b.tags.length > 0 && (
                <span className="text-[11px] text-muted-gray">{b.tags.map((t) => t.name).join('، ')}</span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor('area.city', {
        header: 'المدينة والمنطقة',
        cell: (info) => (
          <span className="text-[14px] font-semibold text-on-surface">
            {info.getValue() ?? '—'} - {info.row.original.area?.name ?? ''}
          </span>
        ),
      }),
      columnHelper.accessor('commissionRate', {
        header: 'عمولة المنصة',
        cell: (info) => (
          <span className="font-bold text-secondary">
            {info.getValue() !== undefined ? `${Number(info.getValue()).toFixed(1)}%` : '10.0%'}
          </span>
        ),
      }),
      columnHelper.accessor('rating', {
        header: () => <div className="text-center">التقييم</div>,
        cell: (info) => (
          <div className="flex items-center justify-center gap-1 text-warning-amber">
            <span className="material-symbols-outlined text-[18px]">star</span>
            <span className="text-[14px] font-bold">{info.getValue().toFixed(1)}</span>
          </div>
        ),
      }),
      columnHelper.accessor('isOpen', {
        header: 'الحالة التشغيلية',
        cell: (info) => (
          <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${info.getValue() ? 'bg-success' : 'bg-error'}`} />
            <span className={`text-[13px] font-bold ${info.getValue() ? 'text-success' : 'text-error'}`}>
              {info.getValue() ? 'مفتوح (يستقبل)' : 'مغلق (معطل)'}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor((row) => row.owner?.status, {
        id: 'approval',
        header: 'حالة الاعتماد',
        cell: (info) => {
          const status = info.getValue();
          const map: Record<string, { label: string; cls: string }> = {
            PENDING: { label: 'بانتظار الموافقة', cls: 'bg-warning-amber/15 text-warning-amber border-warning-amber/30' },
            ACTIVE: { label: 'معتمد', cls: 'bg-success/10 text-success border-success/20' },
            SUSPENDED: { label: 'معلّق', cls: 'bg-error/10 text-error border-error/20' },
            BANNED: { label: 'محظور', cls: 'bg-error/10 text-error border-error/20' },
          };
          const s = map[status ?? 'ACTIVE'] ?? map.ACTIVE;
          return <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold border ${s.cls}`}>{s.label}</span>;
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <div className="text-left">إجراءات</div>,
        cell: (info) => {
          const b = info.row.original;
          const isPending = b.owner?.status === 'PENDING';
          return (
            <div className="flex items-center justify-end gap-2">
              {isPending ? (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setPwModal({ business: b, mode: 'approve' }); setPwValue(''); }}
                    className="flex h-9 items-center gap-1 px-3 rounded-lg bg-success text-white text-[12px] font-bold hover:brightness-95 transition"
                  >
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    موافقة
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setRejectTarget(b); }}
                    className="flex h-9 items-center gap-1 px-3 rounded-lg bg-error/10 text-error text-[12px] font-bold hover:bg-error/20 transition border border-error/20"
                  >
                    <span className="material-symbols-outlined text-[16px]">cancel</span>
                    رفض
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(b); }}
                    title="تعديل النوع والتصنيفات"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors border border-primary/20"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setPwModal({ business: b, mode: 'reset' }); setPwValue(''); }}
                    title="إعادة تعيين كلمة المرور"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-secondary hover:bg-secondary/10 transition-colors border border-secondary/20"
                  >
                    <span className="material-symbols-outlined text-[18px]">key</span>
                  </button>
                </>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedBusinessId(b.id); }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors border border-primary/20"
              >
                <span className="material-symbols-outlined text-[18px]">visibility</span>
              </button>
            </div>
          );
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filteredBusinesses,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const handleInterventionSubmit = () => {
    if (!confirmAction || !selectedBusinessId) return;
    const { type, payload } = confirmAction;

    if (type === 'isOpen') {
      updateStatusMutation.mutate({ id: selectedBusinessId, isOpen: payload });
    }
    if (type === 'commission') {
      updateCommissionMutation.mutate({ id: selectedBusinessId, rate: payload });
    }
  };

  return (
    <>
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-6 left-6 z-[9999] flex items-center gap-2 rounded-xl px-5 py-4 text-white shadow-lg animate-bounce ${
          toast.type === 'success' ? 'bg-secondary' : 'bg-error'
        }`}>
          <span className="material-symbols-outlined">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          <span className="font-bold text-[14px]">{toast.message}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-on-surface/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface-white p-6 shadow-xl border border-border border-t-[6px] border-t-primary animate-fade-in" dir="rtl">
            <h3 className="text-lg font-bold text-on-surface mb-2">تأكيد الإجراء الإداري</h3>
            <p className="text-[14px] text-muted-gray mb-6 leading-relaxed">
              {confirmAction.message}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                className="h-11 px-5 rounded-xl border border-border hover:bg-surface-container font-semibold text-[14px] transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleInterventionSubmit}
                disabled={updateStatusMutation.isPending || updateCommissionMutation.isPending}
                className="h-11 px-6 rounded-xl bg-primary text-white font-bold text-[14px] shadow-md hover:brightness-95 disabled:opacity-50 transition-colors"
              >
                تأكيد وتطبيق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password modal (approve / reset) */}
      {pwModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-on-surface/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface-white p-6 shadow-xl border border-border border-t-[6px] border-t-primary" dir="rtl">
            <h3 className="text-lg font-bold text-on-surface mb-1">
              {pwModal.mode === 'approve' ? 'الموافقة على المتجر وتعيين كلمة المرور' : 'إعادة تعيين كلمة المرور'}
            </h3>
            <p className="text-[13px] text-muted-gray mb-4">
              {pwModal.business.name} — {pwModal.business.owner?.phone}
            </p>
            <label className="mr-1 block text-[12px] font-medium text-muted-gray mb-2">كلمة المرور</label>
            <input
              type="text"
              value={pwValue}
              onChange={(e) => setPwValue(e.target.value)}
              placeholder="6 أحرف على الأقل"
              className="w-full h-11 px-4 bg-background/30 border border-border-beige rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none text-[14px]"
            />
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => { setPwModal(null); setPwValue(''); }} className="h-11 px-5 rounded-xl border border-border hover:bg-surface-container font-semibold text-[14px]">إلغاء</button>
              <button
                onClick={submitPassword}
                disabled={approveMutation.isPending || resetPasswordMutation.isPending}
                className="h-11 px-6 rounded-xl bg-primary text-white font-bold text-[14px] shadow-md hover:brightness-95 disabled:opacity-50"
              >
                {pwModal.mode === 'approve' ? 'موافقة وتفعيل' : 'حفظ كلمة المرور'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject confirmation */}
      {rejectTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-on-surface/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface-white p-6 shadow-xl border border-border border-t-[6px] border-t-error" dir="rtl">
            <h3 className="text-lg font-bold text-on-surface mb-2">رفض طلب التسجيل</h3>
            <p className="text-[14px] text-muted-gray mb-6 leading-relaxed">
              سيتم حذف طلب تسجيل المتجر «{rejectTarget.name}» وحساب صاحبه نهائياً. لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setRejectTarget(null)} className="h-11 px-5 rounded-xl border border-border hover:bg-surface-container font-semibold text-[14px]">إلغاء</button>
              <button
                onClick={() => rejectMutation.mutate(rejectTarget.id)}
                disabled={rejectMutation.isPending}
                className="h-11 px-6 rounded-xl bg-error text-white font-bold text-[14px] shadow-md hover:brightness-95 disabled:opacity-50"
              >
                تأكيد الرفض والحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create store modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-on-surface/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface-white p-6 shadow-xl border border-border border-t-[6px] border-t-primary max-h-[90vh] overflow-y-auto" dir="rtl">
            <h3 className="text-lg font-bold text-on-surface mb-4">إضافة متجر جديد (مفعّل مباشرة)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[12px] font-medium text-muted-gray">اسم المتجر</label>
                <input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="w-full h-11 px-4 bg-background/30 border border-border-beige rounded-xl outline-none text-[14px] focus:border-primary" />
              </div>
              <div className="space-y-1">
                <label className="block text-[12px] font-medium text-muted-gray">النوع</label>
                <select
                  value={createForm.type}
                  onChange={(e) => setCreateForm({ ...createForm, type: e.target.value as BusinessType, tagIds: [] })}
                  className="w-full h-11 px-4 bg-background/30 border border-border-beige rounded-xl outline-none text-[14px] focus:border-primary cursor-pointer"
                >
                  <option value="FOOD">مأكولات (مطاعم/كافيهات)</option>
                  <option value="STORE">متاجر (سوبرماركت)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[12px] font-medium text-muted-gray">اسم صاحب المتجر</label>
                <input value={createForm.ownerName} onChange={(e) => setCreateForm({ ...createForm, ownerName: e.target.value })} className="w-full h-11 px-4 bg-background/30 border border-border-beige rounded-xl outline-none text-[14px] focus:border-primary" />
              </div>
              <div className="space-y-1">
                <label className="block text-[12px] font-medium text-muted-gray">رقم الهاتف</label>
                <input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} placeholder="0599XXXXXX" className="w-full h-11 px-4 bg-background/30 border border-border-beige rounded-xl outline-none text-[14px] focus:border-primary" dir="ltr" />
              </div>
              <div className="space-y-1">
                <label className="block text-[12px] font-medium text-muted-gray">المنطقة</label>
                <select value={createForm.areaId} onChange={(e) => setCreateForm({ ...createForm, areaId: e.target.value })} className="w-full h-11 px-4 bg-background/30 border border-border-beige rounded-xl outline-none text-[14px] focus:border-primary cursor-pointer">
                  <option value="">اختر المنطقة</option>
                  {areas.map((a: Area) => (<option key={a.id} value={a.id}>{a.city} - {a.name}</option>))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[12px] font-medium text-muted-gray">كلمة المرور</label>
                <input type="text" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="6 أحرف على الأقل" className="w-full h-11 px-4 bg-background/30 border border-border-beige rounded-xl outline-none text-[14px] focus:border-primary" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[12px] font-medium text-muted-gray">العنوان بالتفصيل (اختياري)</label>
                <input value={createForm.addressDetail} onChange={(e) => setCreateForm({ ...createForm, addressDetail: e.target.value })} className="w-full h-11 px-4 bg-background/30 border border-border-beige rounded-xl outline-none text-[14px] focus:border-primary" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="block text-[12px] font-medium text-muted-gray">التصنيفات (اختر واحداً أو أكثر)</label>
                <div className="flex flex-wrap gap-2">
                  {createTags.length === 0 ? (
                    <span className="text-[13px] text-muted-gray">لا توجد تصنيفات</span>
                  ) : (
                    createTags.map((tag: Tag) => {
                      const active = createForm.tagIds.includes(tag.id);
                      return (
                        <button
                          type="button"
                          key={tag.id}
                          onClick={() => toggleCreateTag(tag.id)}
                          className={`rounded-full px-3 py-1.5 text-[12px] font-bold border transition ${active ? 'bg-primary text-white border-primary' : 'bg-background/30 text-on-surface border-border-beige hover:border-primary'}`}
                        >
                          {tag.name}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
              
              {createForm.type === 'FOOD' && createForm.areaId && (
                <div className="space-y-2 sm:col-span-2 mt-2 border-t border-border-beige pt-4">
                  <label className="block text-[12px] font-medium text-muted-gray">
                    مناطق التوصيل (القرى/الأحياء داخل مدينة {areas.find(a => a.id === createForm.areaId)?.city})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {areas.filter(a => a.city === areas.find(x => x.id === createForm.areaId)?.city).length === 0 ? (
                      <span className="text-[13px] text-muted-gray">لا توجد مناطق للتوصيل</span>
                    ) : (
                      areas.filter(a => a.city === areas.find(x => x.id === createForm.areaId)?.city).map((area: Area) => {
                        const active = createForm.deliveryAreaIds.includes(area.id);
                        return (
                          <button
                            type="button"
                            key={area.id}
                            onClick={() => toggleCreateDeliveryArea(area.id)}
                            className={`rounded-full px-3 py-1.5 text-[12px] font-bold border transition ${active ? 'bg-primary text-white border-primary' : 'bg-background/30 text-on-surface border-border-beige hover:border-primary'}`}
                          >
                            {area.name}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

            </div>
            {createError && <p className="text-error text-[13px] font-semibold mt-3 text-center">{createError}</p>}
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowCreate(false)} className="h-11 px-5 rounded-xl border border-border hover:bg-surface-container font-semibold text-[14px]">إلغاء</button>
              <button onClick={submitCreate} disabled={createMutation.isPending} className="h-11 px-6 rounded-xl bg-primary text-white font-bold text-[14px] shadow-md hover:brightness-95 disabled:opacity-50">
                إنشاء وتفعيل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit type/tags modal */}
      {editTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-on-surface/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface-white p-6 shadow-xl border border-border border-t-[6px] border-t-primary" dir="rtl">
            <h3 className="text-lg font-bold text-on-surface mb-1">تعديل النوع والتصنيفات</h3>
            <p className="text-[13px] text-muted-gray mb-4">{editTarget.name}</p>

            <label className="block text-[12px] font-medium text-muted-gray mb-2">النوع</label>
            <select
              value={editType}
              onChange={(e) => { setEditType(e.target.value as BusinessType); setEditTagIds([]); }}
              className="w-full h-11 px-4 bg-background/30 border border-border-beige rounded-xl outline-none text-[14px] focus:border-primary cursor-pointer mb-4"
            >
              <option value="FOOD">مأكولات (مطاعم/كافيهات)</option>
              <option value="STORE">متاجر (سوبرماركت)</option>
            </select>

            <label className="block text-[12px] font-medium text-muted-gray mb-2">التصنيفات</label>
            <div className="flex flex-wrap gap-2">
              {editAvailableTags.length === 0 ? (
                <span className="text-[13px] text-muted-gray">لا توجد تصنيفات</span>
              ) : (
                editAvailableTags.map((tag: Tag) => {
                  const active = editTagIds.includes(tag.id);
                  return (
                    <button
                      type="button"
                      key={tag.id}
                      onClick={() => toggleEditTag(tag.id)}
                      className={`rounded-full px-3 py-1.5 text-[12px] font-bold border transition ${active ? 'bg-primary text-white border-primary' : 'bg-background/30 text-on-surface border-border-beige hover:border-primary'}`}
                    >
                      {tag.name}
                    </button>
                  );
                })
              )}
            </div>

            {editType === 'FOOD' && editTarget?.area?.city && (
              <>
                <label className="block text-[12px] font-medium text-muted-gray mb-2 mt-4">
                  مناطق التوصيل (القرى/الأحياء داخل مدينة {editTarget.area.city})
                </label>
                <div className="flex flex-wrap gap-2">
                  {areas.filter(a => a.city === editTarget.area?.city).length === 0 ? (
                    <span className="text-[13px] text-muted-gray">لا توجد مناطق للتوصيل</span>
                  ) : (
                    areas.filter(a => a.city === editTarget.area?.city).map((area: Area) => {
                      const active = editDeliveryAreaIds.includes(area.id);
                      return (
                        <button
                          type="button"
                          key={area.id}
                          onClick={() => toggleEditDeliveryArea(area.id)}
                          className={`rounded-full px-3 py-1.5 text-[12px] font-bold border transition ${active ? 'bg-primary text-white border-primary' : 'bg-background/30 text-on-surface border-border-beige hover:border-primary'}`}
                        >
                          {area.name}
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}

            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setEditTarget(null)} className="h-11 px-5 rounded-xl border border-border hover:bg-surface-container font-semibold text-[14px]">إلغاء</button>
              <button onClick={() => editMutation.mutate()} disabled={editMutation.isPending} className="h-11 px-6 rounded-xl bg-primary text-white font-bold text-[14px] shadow-md hover:brightness-95 disabled:opacity-50">
                حفظ التغييرات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">إدارة المتاجر والمنشآت الشريكة</h2>
          <p className="text-[13px] text-muted-gray mt-1">راجع الطلبات المعلّقة، اعتمد المتاجر، عيّن العمولات وأنشئ متاجر جديدة</p>
        </div>
        <button
          onClick={() => { setCreateForm(emptyCreate); setCreateError(''); setShowCreate(true); }}
          className="flex h-11 items-center gap-2 px-5 rounded-xl bg-primary text-white font-bold text-[14px] shadow-md hover:brightness-95 transition"
        >
          <span className="material-symbols-outlined text-[20px]">add_business</span>
          إضافة متجر جديد
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-border-beige bg-surface-white p-5 shadow-sm mt-margin-standard">
        <div className="grid grid-cols-1 items-end gap-gap-md sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <label className="mr-1 block text-[12px] font-medium text-muted-gray">البحث عن متجر</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-muted-gray text-[20px]">
                search
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 pr-11 pl-4 bg-background/30 border border-border-beige rounded-xl focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-[14px]"
                placeholder="اسم المتجر، الرقم التعريفي..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="mr-1 block text-[12px] font-medium text-muted-gray">النوع</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full h-11 px-4 bg-background/30 border border-border-beige rounded-xl focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-[14px] cursor-pointer"
            >
              <option value="ALL">كل الأنواع</option>
              <option value="FOOD">مأكولات</option>
              <option value="STORE">متاجر</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="mr-1 block text-[12px] font-medium text-muted-gray">المدينة</label>
            <select
              value={cityFilter}
              onChange={(e) => { setCityFilter(e.target.value); setVillageFilter('ALL'); }}
              className="w-full h-11 px-4 bg-background/30 border border-border-beige rounded-xl focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-[14px] cursor-pointer"
            >
              <option value="ALL">كل المدن</option>
              {uniqueCities.map((city: string) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="mr-1 block text-[12px] font-medium text-muted-gray">القرية / الحي</label>
            <select
              value={villageFilter}
              onChange={(e) => setVillageFilter(e.target.value)}
              disabled={cityFilter === 'ALL'}
              className="w-full h-11 px-4 bg-background/30 border border-border-beige rounded-xl focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-[14px] cursor-pointer disabled:opacity-50"
            >
              <option value="ALL">كل القرى والأحياء</option>
              {villagesForCity.map((a: Area) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="mr-1 block text-[12px] font-medium text-muted-gray">الحالة التشغيلية</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-11 px-4 bg-background/30 border border-border-beige rounded-xl focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-[14px] cursor-pointer"
            >
              <option value="ALL">الكل</option>
              <option value="PENDING">بانتظار الموافقة</option>
              <option value="OPEN">مفتوح حالياً</option>
              <option value="CLOSED">مغلق</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="rounded-2xl border border-border-beige bg-surface-white shadow-sm mt-margin-standard overflow-hidden">
        {isBusinessesLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-[14px] font-medium text-muted-gray">جاري تحميل المتاجر والشركاء...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-right">
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id} className="border-b border-border-beige bg-surface-container-low text-[13px] font-semibold text-on-surface">
                      {hg.headers.map((h) => (
                        <th key={h.id} className="px-6 py-4">
                          {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-border-beige">
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedBusinessId(row.original.id)}
                      className="group cursor-pointer transition-colors hover:bg-background/20"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-6 py-3.5">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="flex items-center justify-between border-t border-border bg-surface-container-low px-6 py-4">
              <p className="text-[13px] text-muted-gray">
                إجمالي المتاجر المتوفرة: {filteredBusinesses.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-white text-on-surface disabled:opacity-40 hover:bg-surface-container transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>
                <span className="text-[13px] text-muted-gray">
                  الصفحة {table.getState().pagination.pageIndex + 1} من {table.getPageCount() || 1}
                </span>
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-white text-on-surface disabled:opacity-40 hover:bg-surface-container transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Business Details Drawer (Left Drawer) */}
      {selectedBusinessId && (
        <div className="fixed inset-0 z-50 flex justify-start bg-on-surface/30 backdrop-blur-xs">
          {/* Backdrop closer */}
          <div className="absolute inset-0" onClick={() => setSelectedBusinessId(null)} />

          {/* Drawer container */}
          <div className="relative w-full max-w-xl bg-surface-white h-screen shadow-2xl flex flex-col z-10 animate-slide-in border-r border-border" dir="rtl">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-border p-5 bg-background/10">
              <div>
                <h3 className="text-[18px] font-bold text-on-surface">ملف ومراقبة المتجر</h3>
                <p className="text-[11px] font-mono text-muted-gray mt-1">ID: {selectedBusinessId}</p>
              </div>
              <button
                onClick={() => setSelectedBusinessId(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-border/30 text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            {/* Drawer Content */}
            {isDetailLoading || !selectedBusiness ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-[13px] text-muted-gray">جاري جلب تفاصيل المتجر وقائمة منتجاته...</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Control Panel */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
                  <h4 className="flex items-center gap-2 text-[14px] font-bold text-primary mb-1 border-b border-primary/20 pb-2">
                    <span className="material-symbols-outlined text-[20px]">bolt</span>
                    خيارات التحكم الإشرافي المتطورة
                  </h4>

                  {/* Open/Close status Toggle override */}
                  <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-[13px] font-bold text-on-surface">إغلاق / تفعيل تشغيل المتجر يدوياً</p>
                      <p className="text-[11px] text-muted-gray mt-0.5">يقوم بتعطيل المتجر فوراً على تطبيق الزبائن</p>
                    </div>
                    <button
                      onClick={() => {
                        const targetState = !selectedBusiness.isOpen;
                        setConfirmAction({
                          type: 'isOpen',
                          payload: targetState,
                          message: `هل أنت متأكد من تغيير حالة استقبال الطلبات لمتجر "${selectedBusiness.name}" يدوياً إلى [${
                            targetState ? 'مفتوح ونشط' : 'مغلق ومقفل إدارياً'
                          }]؟`,
                        });
                      }}
                      className={`h-9 px-4 rounded-lg font-bold text-[12px] shadow-sm transition-all text-white ${
                        selectedBusiness.isOpen ? 'bg-error hover:bg-error/90' : 'bg-success hover:bg-success/90'
                      }`}
                    >
                      {selectedBusiness.isOpen ? 'إغلاق المتجر إدارياً' : 'تفعيل وفتح المتجر'}
                    </button>
                  </div>

                  {/* Custom Commission Rate Slider */}
                  <div className="bg-white p-3 rounded-lg border border-border space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[13px] font-bold text-on-surface">نسبة عمولة المنصة الخاصة بالمتجر</p>
                        <p className="text-[11px] text-muted-gray mt-0.5">تطبق هذه النسبة على كل الطلبيات المستلمة بنجاح</p>
                      </div>
                      <span className="font-extrabold text-[16px] text-primary">
                        {selectedBusiness.commissionRate !== undefined
                          ? `${Number(selectedBusiness.commissionRate).toFixed(1)}%`
                          : '10.0%'}
                      </span>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <input
                        type="range"
                        id="commRateRange"
                        min="0"
                        max="30"
                        step="0.5"
                        defaultValue={
                          selectedBusiness.commissionRate !== undefined
                            ? String(selectedBusiness.commissionRate)
                            : '10'
                        }
                        className="flex-1 accent-primary cursor-pointer"
                      />
                      <button
                        onClick={() => {
                          const range = document.getElementById('commRateRange') as HTMLInputElement;
                          const val = Number(range?.value || 10);
                          setConfirmAction({
                            type: 'commission',
                            payload: val,
                            message: `هل تريد تغيير نسبة عمولة متجر "${selectedBusiness.name}" إلى ${val.toFixed(1)}%؟`,
                          });
                        }}
                        className="h-8 px-4 rounded bg-primary text-white text-[11px] font-bold hover:brightness-95 transition-all shadow-sm"
                      >
                        حفظ النسبة
                      </button>
                    </div>
                  </div>
                </div>

                {/* Store Profile Basic Details */}
                <div className="rounded-xl border border-border p-4 bg-surface space-y-3">
                  <h5 className="flex items-center gap-1.5 text-[13px] font-bold text-on-surface pb-1.5 border-b border-border">
                    <span className="material-symbols-outlined text-[18px] text-secondary">info</span>
                    معلومات المتجر الشريك
                  </h5>
                  <div className="grid grid-cols-2 gap-3 text-[13px] leading-relaxed">
                    <div>
                      <span className="text-muted-gray">اسم المتجر:</span>
                      <p className="font-bold text-on-surface">{selectedBusiness.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-gray">النوع:</span>
                      <p className="font-bold text-on-surface">{TYPE_LABEL[selectedBusiness.type] || selectedBusiness.type}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-gray">التصنيفات:</span>
                      <p className="font-bold text-on-surface">
                        {selectedBusiness.tags && selectedBusiness.tags.length > 0
                          ? selectedBusiness.tags.map((t) => t.name).join('، ')
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-gray">المنطقة الجغرافية:</span>
                      <p className="font-bold text-on-surface">{selectedBusiness.area?.city} - {selectedBusiness.area?.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-gray">نوع التوصيل بالمنصة:</span>
                      <p className="font-bold text-on-surface">
                        {selectedBusiness.deliveryType === 'PLATFORM' ? 'توصيل عبر كباتن المنصة' : 'توصيل ذاتي من المتجر'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Menu Catalog Products List */}
                <div className="rounded-xl border border-border p-4 bg-surface space-y-3">
                  <h5 className="flex items-center gap-1.5 text-[13px] font-bold text-on-surface pb-1.5 border-b border-border">
                    <span className="material-symbols-outlined text-[18px] text-primary">restaurant_menu</span>
                    كتالوج قائمة المنتجات المعروضة ({selectedBusiness.products?.length || 0})
                  </h5>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {selectedBusiness.products?.map((p: Product) => (
                      <div key={p.id} className="flex justify-between items-center text-[12px] bg-background/10 rounded-lg p-2.5 border border-border/40">
                        <div>
                          <p className="font-bold text-on-surface">{p.name}</p>
                          {p.description && (
                            <p className="text-[10px] text-muted-gray mt-0.5 leading-relaxed">{p.description}</p>
                          )}
                          {p.category && (
                            <span className="inline-block bg-surface px-2 py-0.5 rounded text-[9px] text-primary font-bold border border-border mt-1">
                              {p.category}
                            </span>
                          )}
                        </div>
                        <div className="text-left space-y-1">
                          <p className="font-bold text-primary font-mono">₪{Number(p.price).toFixed(2)}</p>
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold ${
                            p.isAvailable ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {p.isAvailable ? 'متاح للطلب' : 'نفذت الكمية'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {(!selectedBusiness.products || selectedBusiness.products.length === 0) && (
                      <p className="text-[12px] text-muted-gray text-center py-4">لم يقم المتجر برفع أي منتجات بعد.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
