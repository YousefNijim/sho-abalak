'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driversApi, areasApi, ordersApi } from '@shu/api-client';
import type { Driver, Area } from '@shu/api-client';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';

const DRIVER_STATUS_LABEL: Record<string, string> = {
  AVAILABLE: 'متاح للتوصيل',
  BUSY: 'مشغول بطلب',
  OFFLINE: 'غير متصل حالياً',
};

const DRIVER_STATUS_STYLE: Record<string, string> = {
  AVAILABLE: 'bg-green-50 text-green-700 border-green-200',
  BUSY: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  OFFLINE: 'bg-gray-50 text-gray-500 border-gray-200',
};

const columnHelper = createColumnHelper<Driver>();

export default function DriversPage() {
  const qc = useQueryClient();

  // Search & Filters state
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [villageFilter, setVillageFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected Driver for Details Drawer
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  // Intervention Confirmation Dialogs state
  const [confirmAction, setConfirmAction] = useState<{ type: 'status' | 'area' | 'settle', payload: any, message: string } | null>(null);
  const [settleAmountInput, setSettleAmountInput] = useState<string>('');

  // Success/Error Toasts
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Queries
  const { data: drivers = [], isLoading: isDriversLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => driversApi.list(),
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: () => areasApi.list(),
  });

  const uniqueCities = useMemo(() => Array.from(new Set(areas.map((a: Area) => a.city))), [areas]);
  const villagesForCity = useMemo(() => areas.filter((a: Area) => a.city === cityFilter), [areas, cityFilter]);

  const { data: allOrders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.list(),
    enabled: !!selectedDriverId,
  });

  const selectedDriver = useMemo(() => {
    return drivers.find((d) => d.id === selectedDriverId);
  }, [drivers, selectedDriverId]);

  // Statistics for selected driver
  const driverStats = useMemo(() => {
    if (!selectedDriver) return { count: 0, earnings: 0 };
    const driverOrders = allOrders.filter(
      (o) => o.driverId === selectedDriver.id && o.status === 'DELIVERED'
    );
    const earnings = driverOrders.reduce((sum, o) => {
      // Driver gets the business area delivery fee
      const fee = o.business?.area?.deliveryFee ? Number(o.business.area.deliveryFee) : 3;
      return sum + fee;
    }, 0);
    return {
      count: driverOrders.length,
      earnings,
    };
  }, [allOrders, selectedDriver]);

  // Mutations
  const updateDriverMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) =>
      driversApi.adminUpdateStatus(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] });
      showToast('success', 'تم تعديل إعدادات وبيانات ملف الكابتن بنجاح');
      setConfirmAction(null);
    },
    onError: (err: any) => {
      showToast('error', err.response?.data?.message || 'فشل تعديل إعدادات الكابتن');
      setConfirmAction(null);
    },
  });

  const settleAccountMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount?: number }) => driversApi.settleAccount(id, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] });
      showToast('success', 'تم تسوية حساب الكابتن بنجاح وتصفير المديونية');
      setConfirmAction(null);
    },
    onError: (err: any) => {
      showToast('error', err.response?.data?.message || 'فشل تسوية حساب الكابتن');
      setConfirmAction(null);
    },
  });

  // Client side filters
  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      // 1. Area Filter
      if (cityFilter !== 'ALL' && d.area?.city !== cityFilter) return false;
      if (villageFilter !== 'ALL' && d.areaId !== villageFilter) return false;

      // 2. Status Filter
      if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;

      // 3. Text Search
      if (search) {
        const query = search.toLowerCase();
        const drName = d.user?.name?.toLowerCase() || '';
        const drPhone = d.user?.phone || '';
        return drName.includes(query) || drPhone.includes(query);
      }

      return true;
    });
  }, [drivers, search, cityFilter, villageFilter, statusFilter]);

  // TanStack columns
  const columns = useMemo(
    () => [
      columnHelper.accessor('user.name', {
        header: 'كابتن التوصيل',
        cell: (info) => (
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/10 text-secondary font-extrabold text-[12px]">
              {info.getValue()?.charAt(0) ?? '?'}
            </div>
            <div>
              <p className="text-[14px] font-semibold text-on-surface">{info.getValue() ?? '—'}</p>
              <p className="text-[10px] text-muted-gray">ID: #{info.row.original.id.slice(0, 8)}</p>
            </div>
          </div>
        ),
      }),
      columnHelper.accessor('user.phone', {
        header: 'رقم الهاتف',
        cell: (info) => <span className="font-mono text-[14px]" dir="ltr">{info.getValue() ?? '—'}</span>,
      }),
      columnHelper.accessor('area.city', {
        header: 'المنطقة الافتراضية',
        cell: (info) => (
          <span className="text-[14px] font-semibold text-on-surface">
            {info.getValue() ?? '—'} - {info.row.original.area?.name ?? ''}
          </span>
        ),
      }),
      columnHelper.accessor('rating', {
        header: () => <div className="text-center">تقييم الكابتن</div>,
        cell: (info) => (
          <div className="flex items-center justify-center gap-1 text-warning-amber">
            <span className="material-symbols-outlined text-[18px]">star</span>
            <span className="text-[14px] font-bold">{info.getValue().toFixed(1)}</span>
          </div>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'حالة العمل الحالية',
        cell: (info) => (
          <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold border ${DRIVER_STATUS_STYLE[info.getValue()] ?? ''}`}>
            {DRIVER_STATUS_LABEL[info.getValue()] ?? info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('platformBalance', {
        header: 'المستحق للمنصة',
        cell: (info) => (
          <span className="font-bold text-[14px] text-error">
            {Number(info.getValue() ?? 0).toFixed(2)} ₪
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <div className="text-left">إجراءات</div>,
        cell: (info) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDriverId(info.row.original.id);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors border border-primary/20"
          >
            <span className="material-symbols-outlined text-[18px]">visibility</span>
          </button>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filteredDrivers,
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
    if (!confirmAction || !selectedDriverId) return;
    const { type, payload } = confirmAction;

    if (type === 'settle') {
      settleAccountMutation.mutate({ 
        id: selectedDriverId, 
        amount: settleAmountInput ? Number(settleAmountInput) : undefined 
      });
      return;
    }

    let dto: any = {};
    if (type === 'status') dto.status = payload;
    if (type === 'area') dto.areaId = payload;

    updateDriverMutation.mutate({ id: selectedDriverId, dto });
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
            {confirmAction.type === 'settle' && (
              <div className="mb-6 space-y-2">
                <label className="mr-1 block text-[13px] font-bold text-on-surface">مبلغ التسوية (شيكل)</label>
                <input
                  type="number"
                  placeholder="أدخل المبلغ جزئياً أو أتركه فارغاً للتسوية الكاملة"
                  value={settleAmountInput}
                  onChange={(e) => setSettleAmountInput(e.target.value)}
                  className="w-full h-11 px-4 bg-background/30 border border-border-beige rounded-xl focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-[14px] font-mono"
                  dir="ltr"
                />
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                className="h-11 px-5 rounded-xl border border-border hover:bg-surface-container font-semibold text-[14px] transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleInterventionSubmit}
                disabled={updateDriverMutation.isPending}
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
          <h2 className="text-2xl font-bold text-on-surface">إدارة كباتن وسائقي التوصيل</h2>
          <p className="text-[13px] text-muted-gray mt-1">تتبع الحالات التشغيلية، عيّن المناطق الجغرافية، وراجع الأرباح والتوصيلات</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-border-beige bg-surface-white p-5 shadow-sm mt-margin-standard">
        <div className="grid grid-cols-1 items-end gap-gap-md sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <label className="mr-1 block text-[12px] font-medium text-muted-gray">البحث عن كابتن</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-muted-gray text-[20px]">
                search
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 pr-11 pl-4 bg-background/30 border border-border-beige rounded-xl focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-[14px]"
                placeholder="اسم الكابتن، رقم الجوال..."
              />
            </div>
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
              <option value="AVAILABLE">متاح للعمل</option>
              <option value="BUSY">مشغول بتوصيل</option>
              <option value="OFFLINE">غير متصل</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="rounded-2xl border border-border-beige bg-surface-white shadow-sm mt-margin-standard overflow-hidden">
        {isDriversLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-[14px] font-medium text-muted-gray">جاري جلب ملفات كباتن التوصيل...</p>
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
                      onClick={() => setSelectedDriverId(row.original.id)}
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
                إجمالي الكباتن المسجلين: {filteredDrivers.length}
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

      {/* Drivers Details Slide Drawer (Left Drawer) */}
      {selectedDriverId && selectedDriver && (
        <div className="fixed inset-0 z-50 flex justify-start bg-on-surface/30 backdrop-blur-xs">
          {/* Backdrop closer */}
          <div className="absolute inset-0" onClick={() => setSelectedDriverId(null)} />

          {/* Drawer container */}
          <div className="relative w-full max-w-xl bg-surface-white h-screen shadow-2xl flex flex-col z-10 animate-slide-in border-r border-border" dir="rtl">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-border p-5 bg-background/10">
              <div>
                <h3 className="text-[18px] font-bold text-on-surface">إعدادات وملف الكابتن</h3>
                <p className="text-[11px] font-mono text-muted-gray mt-1">ID: {selectedDriverId}</p>
              </div>
              <button
                onClick={() => setSelectedDriverId(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-border/30 text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Control Override Actions Panel */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
                <h4 className="flex items-center gap-2 text-[14px] font-bold text-primary mb-1 border-b border-primary/20 pb-2">
                  <span className="material-symbols-outlined text-[20px]">bolt</span>
                  خيارات التحكم الإشرافي للكابتن
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  {/* Status override */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-on-surface block">تجاوز الحالة يدويًا</label>
                    <select
                      value={selectedDriver.status}
                      onChange={(e) => {
                        const val = e.target.value;
                        setConfirmAction({
                          type: 'status',
                          payload: val,
                          message: `هل أنت متأكد من تغيير حالة كابتن التوصيل "${selectedDriver.user?.name}" يدوياً إلى [${DRIVER_STATUS_LABEL[val]}]؟`,
                        });
                      }}
                      className="w-full h-10 px-2 bg-surface border border-border-beige rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none text-[12px] font-bold cursor-pointer"
                    >
                      {Object.entries(DRIVER_STATUS_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Area override */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-on-surface block">إعادة تعيين منطقة العمل</label>
                    <select
                      value={selectedDriver.areaId}
                      onChange={(e) => {
                        const val = e.target.value;
                        const arName = areas.find((a) => a.id === val)?.name || 'المنطقة';
                        setConfirmAction({
                          type: 'area',
                          payload: val,
                          message: `هل تريد تغيير منطقة عمل كابتن التوصيل "${selectedDriver.user?.name}" وتعيينه يدوياً في "${arName}"؟`,
                        });
                      }}
                      className="w-full h-10 px-2 bg-surface border border-border-beige rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none text-[12px] font-bold cursor-pointer"
                    >
                      {areas.map((a: Area) => (
                        <option key={a.id} value={a.id}>
                          {a.city} - {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Earnings & Delivery statistics logs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border p-4 bg-surface-white flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-error">
                      <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-gray">المستحق للمنصة</span>
                      <h4 className="font-extrabold text-[18px] text-error">₪{Number(selectedDriver.platformBalance ?? 0).toFixed(2)}</h4>
                    </div>
                  </div>
                  {Number(selectedDriver.platformBalance) > 0 && (
                    <button
                      onClick={() => {
                        setSettleAmountInput(Number(selectedDriver.platformBalance).toFixed(2));
                        setConfirmAction({
                          type: 'settle',
                          payload: null,
                          message: `تسوية مديونية الكابتن "${selectedDriver.user?.name}" البالغة ${Number(selectedDriver.platformBalance).toFixed(2)} ₪. يمكنك تحديد مبلغ أقل للتسوية الجزئية.`
                        });
                      }}
                      className="w-full mt-2 h-9 rounded-lg bg-error/10 text-error font-bold text-[13px] hover:bg-error hover:text-white transition-colors"
                    >
                      تسوية الحساب
                    </button>
                  )}
                </div>

                <div className="rounded-xl border border-border p-4 bg-surface-white flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <span className="material-symbols-outlined text-[22px]">local_shipping</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-gray">توصيلات مكتملة مسواة</span>
                    <h4 className="font-extrabold text-[18px] text-on-surface">{driverStats.count} طلب توصيل</h4>
                  </div>
                </div>
              </div>

              {/* Driver Basic Details Profile card */}
              <div className="rounded-xl border border-border p-4 bg-surface space-y-3">
                <h5 className="flex items-center gap-1.5 text-[13px] font-bold text-on-surface pb-1.5 border-b border-border">
                  <span className="material-symbols-outlined text-[18px] text-secondary">info</span>
                  بيانات ملف كابتن التوصيل
                </h5>
                <div className="grid grid-cols-2 gap-3 text-[13px] leading-relaxed">
                  <div>
                    <span className="text-muted-gray">الاسم الكامل:</span>
                    <p className="font-bold text-on-surface">{selectedDriver.user?.name ?? '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-gray">رقم جوال الكابتن:</span>
                    <p className="font-bold text-on-surface font-mono" dir="ltr">{selectedDriver.user?.phone ?? '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-gray">منطقة التغطية الافتراضية:</span>
                    <p className="font-bold text-on-surface">{selectedDriver.area?.city} - {selectedDriver.area?.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-gray">متوسط تقييم العملاء:</span>
                    <div className="flex items-center gap-1 text-warning-amber mt-0.5">
                      <span className="material-symbols-outlined text-[18px]">star</span>
                      <p className="font-bold text-[14px]">{selectedDriver.rating.toFixed(1)} / 5.0</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-gray">حالة الاتصال حالياً:</span>
                    <p className="font-bold text-on-surface">
                      {DRIVER_STATUS_LABEL[selectedDriver.status] ?? selectedDriver.status}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
