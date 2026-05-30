'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { businessesApi, areasApi } from '@shu/api-client';
import type { Business, Area, Product } from '@shu/api-client';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';

const CATEGORY_LABEL: Record<string, string> = {
  RESTAURANT: 'مطاعم',
  STORE: 'محلات',
  CAFE: 'كافيه',
};

const CATEGORY_STYLE: Record<string, string> = {
  restaurant: 'bg-primary/10 text-primary border-primary/20',
  store: 'bg-tertiary/10 text-tertiary border-tertiary/20',
  cafe: 'bg-secondary-container/40 text-secondary border-secondary-container',
};

const columnHelper = createColumnHelper<Business>();

export default function BusinessesPage() {
  const qc = useQueryClient();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [areaFilter, setAreaFilter] = useState('ALL');
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

  // Queries
  const { data: businesses = [], isLoading: isBusinessesLoading } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => businessesApi.list(),
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: () => areasApi.list(),
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

  // Client side filtering
  const filteredBusinesses = useMemo(() => {
    return businesses.filter((b) => {
      // 1. Category Filter
      if (categoryFilter !== 'ALL' && b.category !== categoryFilter) return false;

      // 2. Area Filter
      if (areaFilter !== 'ALL' && b.areaId !== areaFilter) return false;

      // 3. Status Filter
      if (statusFilter !== 'ALL') {
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
  }, [businesses, search, categoryFilter, areaFilter, statusFilter]);

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
      columnHelper.accessor('category', {
        header: 'التصنيف',
        cell: (info) => (
          <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold border ${CATEGORY_STYLE[info.getValue().toLowerCase()] ?? ''}`}>
            {CATEGORY_LABEL[info.getValue()] ?? info.getValue()}
          </span>
        ),
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
      columnHelper.display({
        id: 'actions',
        header: () => <div className="text-left">إجراءات</div>,
        cell: (info) => (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedBusinessId(info.row.original.id);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors border border-primary/20"
            >
              <span className="material-symbols-outlined text-[18px]">visibility</span>
            </button>
          </div>
        ),
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">إدارة المتاجر والمنشآت الشريكة</h2>
          <p className="text-[13px] text-muted-gray mt-1">راجع المنتجات، عيّن العمولات، وتحكم بالفتح والإغلاق الإداري</p>
        </div>
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
            <label className="mr-1 block text-[12px] font-medium text-muted-gray">التصنيف</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full h-11 px-4 bg-background/30 border border-border-beige rounded-xl focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-[14px] cursor-pointer"
            >
              <option value="ALL">كل التصنيفات</option>
              <option value="RESTAURANT">مطاعم</option>
              <option value="STORE">محلات</option>
              <option value="CAFE">كافيه</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="mr-1 block text-[12px] font-medium text-muted-gray">المنطقة والمدينة</label>
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="w-full h-11 px-4 bg-background/30 border border-border-beige rounded-xl focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-[14px] cursor-pointer"
            >
              <option value="ALL">كل المناطق</option>
              {areas.map((a: Area) => (
                <option key={a.id} value={a.id}>
                  {a.city} - {a.name}
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
                      <span className="text-muted-gray">التصنيف الرئيسي:</span>
                      <p className="font-bold text-on-surface">{CATEGORY_LABEL[selectedBusiness.category] || selectedBusiness.category}</p>
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
