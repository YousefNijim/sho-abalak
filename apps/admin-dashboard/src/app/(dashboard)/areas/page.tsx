'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { areasApi } from '@shu/api-client';
import type { Area } from '@shu/api-client';
import { StatCard } from '@/components/stat-card';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';

const CITIES = ['رام الله / البيرة', 'نابلس', 'الخليل', 'بيت لحم', 'جنين', 'طولكرم'] as const;

const columnHelper = createColumnHelper<Area>();

export default function AreasPage() {
  const qc = useQueryClient();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('ALL');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [confirmDeleteArea, setConfirmDeleteArea] = useState<Area | null>(null);

  // Form states
  const [newArea, setNewArea] = useState({ city: CITIES[0], name: '', deliveryFee: 3.0, driverDeliveryFee: 2.0, motorcycleFee: 3.0, motorcycleDriverFee: 2.0 });
  const [editFee, setEditFee] = useState<string>('');
  const [editDriverFee, setEditDriverFee] = useState<string>('');
  const [editMotorcycleFee, setEditMotorcycleFee] = useState<string>('');
  const [editMotorcycleDriverFee, setEditMotorcycleDriverFee] = useState<string>('');

  // Success/Error Toasts
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Queries
  const { data: areas = [], isLoading: isAreasLoading } = useQuery({
    queryKey: ['areas'],
    queryFn: () => areasApi.list(),
  });

  // KPI aggregates
  const stats = useMemo(() => {
    if (areas.length === 0) return { citiesCount: 0, areasCount: 0, avgFee: 0 };
    const uniqueCities = new Set(areas.map((a) => a.city));
    const totalFee = areas.reduce((sum, a) => sum + Number(a.deliveryFee), 0);
    return {
      citiesCount: uniqueCities.size,
      areasCount: areas.length,
      avgFee: totalFee / areas.length,
    };
  }, [areas]);

  // Mutations
  const createAreaMutation = useMutation({
    mutationFn: (dto: { city: string; name: string; deliveryFee: number; driverDeliveryFee: number; motorcycleFee: number; motorcycleDriverFee: number }) =>
      areasApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['areas'] });
      showToast('success', 'تمت إضافة المنطقة الجديدة بنجاح');
      setNewArea({ city: CITIES[0], name: '', deliveryFee: 3.0, driverDeliveryFee: 2.0, motorcycleFee: 3.0, motorcycleDriverFee: 2.0 });
      setIsAddModalOpen(false);
    },
    onError: (err: any) => {
      showToast('error', err.response?.data?.message || 'فشل إضافة المنطقة الجديدة');
    },
  });

  const updateAreaMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { deliveryFee?: number; driverDeliveryFee?: number; motorcycleFee?: number; motorcycleDriverFee?: number } }) =>
      areasApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['areas'] });
      showToast('success', 'تم تعديل رسوم توصيل المنطقة بنجاح');
      setEditingArea(null);
      setEditFee('');
      setEditDriverFee('');
      setEditMotorcycleFee('');
      setEditMotorcycleDriverFee('');
    },
    onError: (err: any) => {
      showToast('error', err.response?.data?.message || 'فشل تعديل رسوم التوصيل');
    },
  });

  const deleteAreaMutation = useMutation({
    mutationFn: (id: string) => areasApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['areas'] });
      showToast('success', 'تم حذف المنطقة بنجاح من المنصة');
      setConfirmDeleteArea(null);
    },
    onError: (err: any) => {
      showToast('error', err.response?.data?.message || 'فشل حذف المنطقة (تأكد من عدم وجود طلبات مرتبطة بها)');
      setConfirmDeleteArea(null);
    },
  });

  // Table filtering logic
  const filteredAreas = useMemo(() => {
    return areas.filter((a) => {
      const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase());
      const matchesCity = cityFilter === 'ALL' || a.city === cityFilter;
      return matchesSearch && matchesCity;
    });
  }, [areas, search, cityFilter]);

  // TanStack table definitions
  const columns = useMemo(
    () => [
      columnHelper.accessor('city', {
        header: 'المدينة',
        cell: (info) => <span className="font-bold text-on-surface">{info.getValue()}</span>,
      }),
      columnHelper.accessor('name', {
        header: 'اسم المنطقة',
        cell: (info) => <span className="text-muted-gray">{info.getValue()}</span>,
      }),
      columnHelper.accessor('deliveryFee', {
        header: 'رسوم التوصيل الكلية',
        cell: (info) => (
          <span className="font-bold text-secondary">
            ₪{Number(info.getValue()).toFixed(2)}
          </span>
        ),
      }),
      columnHelper.accessor('driverDeliveryFee', {
        header: 'حصة السائق',
        cell: (info) => (
          <span className="font-semibold text-primary">
            ₪{Number(info.getValue() ?? 0).toFixed(2)}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'platformFee',
        header: 'حصة المنصة',
        cell: (info) => {
          const a = info.row.original;
          const platform = Number(a.deliveryFee) - Number(a.driverDeliveryFee ?? 0);
          return <span className="font-semibold text-green-700">₪{platform.toFixed(2)}</span>;
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'إجراءات التحكم',
        cell: (info) => {
          const rowArea = info.row.original;
          return (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingArea(rowArea);
                  setEditFee(String(rowArea.deliveryFee));
                  setEditDriverFee(String(rowArea.driverDeliveryFee ?? 0));
                  setEditMotorcycleFee(String((rowArea as any).motorcycleFee ?? rowArea.deliveryFee));
                  setEditMotorcycleDriverFee(String((rowArea as any).motorcycleDriverFee ?? rowArea.driverDeliveryFee ?? 0));
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-primary transition-all hover:bg-primary hover:text-white"
                title="تعديل رسوم التوصيل"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
              </button>
              <button
                onClick={() => setConfirmDeleteArea(rowArea)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-error/20 bg-error/5 text-error transition-all hover:bg-error hover:text-white"
                title="حذف المنطقة"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          );
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filteredAreas,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <>
      {/* Toast Alert */}
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

      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-gap-md" dir="rtl">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">إدارة مناطق وتكلفة التوصيل</h2>
          <p className="text-[12px] text-muted-gray mt-0.5">ضبط وتحديث النطاق الجغرافي ورسوم التوصيل الافتراضية عبر المنصة</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex h-12 items-center gap-gap-sm rounded-xl bg-primary px-5 font-bold text-white shadow-md transition-all hover:bg-primary/90"
        >
          <span className="material-symbols-outlined">add_location_alt</span>
          إضافة منطقة جديدة
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-margin-standard sm:grid-cols-2 lg:grid-cols-3" dir="rtl">
        <StatCard icon="explore" label="المدن المغطاة حالياً" value={String(stats.citiesCount)} tone="primary" />
        <StatCard icon="pin_drop" label="إجمالي المناطق المسجلة" value={String(stats.areasCount)} tone="secondary" />
        <StatCard icon="payments" label="متوسط رسوم التوصيل بالمنصة" value={`₪${stats.avgFee.toFixed(2)}`} tone="tertiary" />
      </div>

      {/* Table & Filtering Shell */}
      <div className="rounded-xl border border-border-beige bg-surface-white p-6 shadow-sm mt-margin-standard" dir="rtl">
        <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-1 flex-wrap gap-3 max-w-2xl">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-gray text-[20px]">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث باسم المنطقة..."
                className="h-11 w-full rounded-lg border border-border-beige pr-11 pl-4 text-[13px] text-on-surface placeholder:text-muted-gray focus:border-primary focus:outline-none"
              />
            </div>

            {/* City Dropdown Filter */}
            <div className="relative min-w-[160px]">
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="h-11 w-full rounded-lg border border-border-beige pr-3 pl-8 text-[13px] text-on-surface focus:border-primary focus:outline-none appearance-none font-bold"
              >
                <option value="ALL">كل المدن</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-gray pointer-events-none text-[18px]">
                arrow_drop_down
              </span>
            </div>
          </div>
        </div>

        {/* Datatable */}
        {isAreasLoading ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-muted-gray">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span className="text-[13px] font-bold">جاري تحميل المناطق المغطاة...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-right">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="bg-surface-container-low text-[13px] text-on-surface border-b border-border font-semibold">
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-6 py-4">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-border-beige">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-surface-container-low/20">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-3.5 text-[13px]">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
                {filteredAreas.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-gray">
                      لا توجد أي منطقة مطابقة لشروط البحث والتصفية
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {filteredAreas.length > 0 && (
              <div className="mt-4 flex items-center justify-between border-t border-border-beige pt-4">
                <div className="flex items-center gap-1.5 text-[12px] text-muted-gray font-bold">
                  <span>صفحة</span>
                  <span className="text-on-surface">{table.getState().pagination.pageIndex + 1}</span>
                  <span>من</span>
                  <span className="text-on-surface">{table.getPageCount()}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="flex h-9 items-center gap-1.5 rounded-lg border border-border-beige px-3.5 text-[12px] font-bold text-on-surface transition-all hover:bg-surface-container-low disabled:opacity-40"
                  >
                    السابق
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>
                  <button
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="flex h-9 items-center gap-1.5 rounded-lg border border-border-beige px-3.5 text-[12px] font-bold text-on-surface transition-all hover:bg-surface-container-low disabled:opacity-40"
                  >
                    التالي
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* sliding modal: Add New Area */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsAddModalOpen(false)} />
          {/* Modal Container */}
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200" dir="rtl">
            <div className="flex items-center justify-between border-b border-border-beige pb-3">
              <h3 className="text-lg font-bold text-on-surface">إضافة منطقة توصيل جديدة</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-gray hover:bg-surface-container-low hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* City Selection */}
              <div>
                <label className="block text-[12px] font-bold text-on-surface mb-1.5">المدينة</label>
                <select
                  value={newArea.city}
                  onChange={(e) => setNewArea({ ...newArea, city: e.target.value as any })}
                  className="h-11 w-full rounded-lg border border-border-beige px-3 text-[13px] text-on-surface font-bold focus:border-primary focus:outline-none"
                >
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Area Name Input */}
              <div>
                <label className="block text-[12px] font-bold text-on-surface mb-1.5">اسم المنطقة (باللغة العربية)</label>
                <input
                  type="text"
                  value={newArea.name}
                  onChange={(e) => setNewArea({ ...newArea, name: e.target.value })}
                  placeholder="مثال: البالوع، بيتونيا، الماصيون"
                  className="h-11 w-full rounded-lg border border-border-beige px-3 text-[13px] text-on-surface placeholder:text-muted-gray focus:border-primary focus:outline-none"
                />
              </div>

              {/* Delivery Fee Input */}
              <div>
                <label className="block text-[12px] font-bold text-on-surface mb-1.5">رسوم التوصيل الكلية (شيكل)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={newArea.deliveryFee}
                  onChange={(e) => setNewArea({ ...newArea, deliveryFee: parseFloat(e.target.value) || 0 })}
                  className="h-11 w-full rounded-lg border border-border-beige px-3 text-[13px] text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              {/* Driver share input */}
              <div>
                <label className="block text-[12px] font-bold text-on-surface mb-1.5">حصة السائق من التوصيل بالدراجة (شيكل)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max={newArea.deliveryFee}
                  value={newArea.driverDeliveryFee}
                  onChange={(e) => setNewArea({ ...newArea, driverDeliveryFee: parseFloat(e.target.value) || 0 })}
                  className="h-11 w-full rounded-lg border border-border-beige px-3 text-[13px] text-on-surface focus:border-primary focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-muted-gray">
                  حصة المنصة = {Math.max(0, newArea.deliveryFee - newArea.driverDeliveryFee).toFixed(2)} ₪
                </p>
              </div>

              {/* Motorcycle fees */}
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-3">
                <p className="text-[11px] font-bold text-amber-800">🏍️ رسوم التوصيل بالدراجة النارية</p>
                <div>
                  <label className="block text-[12px] font-bold text-on-surface mb-1.5">الرسوم الكلية بالدراجة (شيكل)</label>
                  <input
                    type="number" step="0.5" min="0"
                    value={newArea.motorcycleFee}
                    onChange={(e) => setNewArea({ ...newArea, motorcycleFee: parseFloat(e.target.value) || 0 })}
                    className="h-11 w-full rounded-lg border border-border-beige px-3 text-[13px] text-on-surface focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-on-surface mb-1.5">حصة السائق بالدراجة (شيكل)</label>
                  <input
                    type="number" step="0.5" min="0" max={newArea.motorcycleFee}
                    value={newArea.motorcycleDriverFee}
                    onChange={(e) => setNewArea({ ...newArea, motorcycleDriverFee: parseFloat(e.target.value) || 0 })}
                    className="h-11 w-full rounded-lg border border-border-beige px-3 text-[13px] text-on-surface focus:border-primary focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-muted-gray">
                    حصة المنصة = {Math.max(0, newArea.motorcycleFee - newArea.motorcycleDriverFee).toFixed(2)} ₪
                  </p>
                </div>
                <p className="text-[10px] text-amber-700">ملاحظة: رسوم السيارة تُحدد يدوياً لكل طلب مصعّد عند الحاجة</p>
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
                onClick={() => createAreaMutation.mutate(newArea)}
                disabled={!newArea.name.trim() || newArea.deliveryFee < 0 || newArea.driverDeliveryFee > newArea.deliveryFee || newArea.motorcycleDriverFee > newArea.motorcycleFee || createAreaMutation.isPending}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-[13px] font-bold text-white shadow-md hover:bg-primary/95 transition-all disabled:opacity-50"
              >
                {createAreaMutation.isPending && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                حفظ المنطقة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* sliding modal: Edit Area Fee */}
      {editingArea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEditingArea(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200" dir="rtl">
            <div className="flex items-center justify-between border-b border-border-beige pb-3">
              <h3 className="text-lg font-bold text-on-surface">تعديل رسوم التوصيل للمنطقة</h3>
              <button
                onClick={() => setEditingArea(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-gray hover:bg-surface-container-low hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-lg bg-surface-container-low p-4 text-[13px] text-muted-gray">
                <span className="font-bold text-on-surface">{editingArea.city}</span> — <span className="font-bold text-on-surface">{editingArea.name}</span>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-on-surface mb-1.5">رسوم التوصيل الكلية (شيكل)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={editFee}
                  onChange={(e) => setEditFee(e.target.value)}
                  className="h-11 w-full rounded-lg border border-border-beige px-3 text-[13px] text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-on-surface mb-1.5">حصة السائق بالدراجة (شيكل)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={editDriverFee}
                  onChange={(e) => setEditDriverFee(e.target.value)}
                  className="h-11 w-full rounded-lg border border-border-beige px-3 text-[13px] text-on-surface focus:border-primary focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-muted-gray">
                  حصة المنصة = {Math.max(0, (parseFloat(editFee) || 0) - (parseFloat(editDriverFee) || 0)).toFixed(2)} ₪
                </p>
              </div>

              {/* Motorcycle fees in edit modal */}
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-3">
                <p className="text-[11px] font-bold text-amber-800">🏍️ رسوم التوصيل بالدراجة النارية</p>
                <div>
                  <label className="block text-[12px] font-bold text-on-surface mb-1.5">الرسوم الكلية بالدراجة (شيكل)</label>
                  <input type="number" step="0.5" min="0" value={editMotorcycleFee} onChange={(e) => setEditMotorcycleFee(e.target.value)}
                    className="h-11 w-full rounded-lg border border-border-beige px-3 text-[13px] text-on-surface focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-on-surface mb-1.5">حصة السائق بالدراجة (شيكل)</label>
                  <input type="number" step="0.5" min="0" value={editMotorcycleDriverFee} onChange={(e) => setEditMotorcycleDriverFee(e.target.value)}
                    className="h-11 w-full rounded-lg border border-border-beige px-3 text-[13px] text-on-surface focus:border-primary focus:outline-none" />
                  <p className="mt-1 text-[11px] text-muted-gray">
                    حصة المنصة = {Math.max(0, (parseFloat(editMotorcycleFee) || 0) - (parseFloat(editMotorcycleDriverFee) || 0)).toFixed(2)} ₪
                  </p>
                </div>
                <p className="text-[10px] text-amber-700">ملاحظة: رسوم السيارة تُحدد يدوياً لكل طلب مصعّد عند الحاجة</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-border-beige pt-4">
              <button
                onClick={() => setEditingArea(null)}
                className="h-11 rounded-xl border border-border-beige bg-white px-5 text-[13px] font-bold text-on-surface hover:bg-surface-container-low transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() =>
                  updateAreaMutation.mutate({
                    id: editingArea.id,
                    dto: {
                      deliveryFee: parseFloat(editFee) || 0,
                      driverDeliveryFee: parseFloat(editDriverFee) || 0,
                      motorcycleFee: parseFloat(editMotorcycleFee) || 0,
                      motorcycleDriverFee: parseFloat(editMotorcycleDriverFee) || 0,
                    },
                  })
                }
                disabled={editFee === '' || parseFloat(editFee) < 0 || (parseFloat(editDriverFee) || 0) > (parseFloat(editFee) || 0) || updateAreaMutation.isPending}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-[13px] font-bold text-white shadow-md hover:bg-primary/95 transition-all disabled:opacity-50"
              >
                {updateAreaMutation.isPending && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                حفظ التعديلات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Delete Area */}
      {confirmDeleteArea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmDeleteArea(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200" dir="rtl">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error/10 text-error">
                <span className="material-symbols-outlined text-[28px]">warning</span>
              </div>
              <h3 className="mt-4 text-[16px] font-bold text-on-surface">هل أنت متأكد من حذف هذه المنطقة؟</h3>
              <p className="mt-2 text-[12px] text-muted-gray leading-relaxed">
                ستقوم بحذف منطقة <span className="font-bold text-on-surface">"{confirmDeleteArea.name}"</span> من مدينة <span className="font-bold text-on-surface">"{confirmDeleteArea.city}"</span> نهائياً. لا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>

            <div className="mt-6 flex justify-center gap-3 border-t border-border-beige pt-4">
              <button
                onClick={() => setConfirmDeleteArea(null)}
                className="h-11 flex-1 rounded-xl border border-border-beige bg-white text-[13px] font-bold text-on-surface hover:bg-surface-container-low transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => deleteAreaMutation.mutate(confirmDeleteArea.id)}
                disabled={deleteAreaMutation.isPending}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-error text-[13px] font-bold text-white shadow-md hover:bg-error/90 transition-all disabled:opacity-50"
              >
                {deleteAreaMutation.isPending && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
