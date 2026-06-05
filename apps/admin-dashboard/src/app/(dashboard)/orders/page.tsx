'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import { ordersApi, driversApi, areasApi, BASE_URL } from '@shu/api-client';
import type { Order, Area, Driver } from '@shu/api-client';
import { getToken } from '@/lib/auth';
import { io } from 'socket.io-client';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'معلق',
  CONFIRMED: 'مؤكد',
  PREPARING: 'جاري التحضير',
  READY: 'جاهز',
  PICKED_UP: 'في الطريق',
  DELIVERED: 'مكتمل',
  CANCELLED: 'ملغي',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-[#FEF9C3] text-[#854D0E] border-[#FEF08A]',
  CONFIRMED: 'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]',
  PREPARING: 'bg-[#FFEDD5] text-[#C2410C] border-[#FED7AA]',
  READY: 'bg-[#EDE9FE] text-[#6D28D9] border-[#DDD6FE]',
  PICKED_UP: 'bg-[#CFFAFE] text-[#0E7490] border-[#A5F3FC]',
  DELIVERED: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]',
  CANCELLED: 'bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]',
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: 'قيد الانتظار',
  PAID: 'مدفوع',
  FAILED: 'فشل الدفع',
  REFUNDED: 'مسترجع',
};

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  PAID: 'bg-green-50 text-green-700 border-green-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
  REFUNDED: 'bg-purple-50 text-purple-700 border-purple-200',
};

const columnHelper = createColumnHelper<Order>();

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  return `منذ ${Math.floor(diff / 86400)} يوم`;
}

export default function OrdersPage() {
  const qc = useQueryClient();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [villageFilter, setVillageFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Order for Details Drawer
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Intervention Confirmation Dialogs state
  const [confirmAction, setConfirmAction] = useState<{
    type: 'status' | 'driver' | 'unassign' | 'payment';
    payload: any;
    message: string;
  } | null>(null);

  // Success/Error Toasts
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Socket connection for live updates
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = io(BASE_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('[Admin Sockets] Connected successfully for live order sync');
    });

    socket.on('order:new', () => {
      console.log('[Admin Sockets] New order received. Refreshing list...');
      qc.invalidateQueries({ queryKey: ['orders'] });
      showToast('success', 'طلب جديد وارد للمنصة الآن!');
    });

    socket.on('order:status_update', (data: any) => {
      console.log('[Admin Sockets] Order status updated:', data);
      qc.invalidateQueries({ queryKey: ['orders'] });
      if (selectedOrderId === data.orderId) {
        qc.invalidateQueries({ queryKey: ['order', selectedOrderId] });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [qc, selectedOrderId]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Queries
  const { data: allOrders = [], isLoading: isOrdersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.list(),
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: () => areasApi.list(),
  });

  const uniqueCities = useMemo(() => Array.from(new Set(areas.map((a: Area) => a.city))), [areas]);
  const villagesForCity = useMemo(() => areas.filter((a: Area) => a.city === cityFilter), [areas, cityFilter]);

  const { data: selectedOrder, isLoading: isOrderDetailLoading } = useQuery({
    queryKey: ['order', selectedOrderId],
    queryFn: () => ordersApi.getById(selectedOrderId!),
    enabled: !!selectedOrderId,
  });

  const { data: availableDrivers = [] } = useQuery({
    queryKey: ['available-drivers', selectedOrder?.customer?.area?.id],
    queryFn: () => driversApi.available(selectedOrder?.customer?.area?.id),
    enabled: !!selectedOrder?.customer?.area?.id,
  });

  const { data: allDrivers = [] } = useQuery({
    queryKey: ['all-drivers'],
    queryFn: () => driversApi.list(),
    enabled: !!selectedOrderId,
  });

  // Dynamic drivers picklist: shows available drivers in area first, falls back to all drivers
  const driversList = useMemo(() => {
    if (availableDrivers.length > 0) return availableDrivers;
    return allDrivers;
  }, [availableDrivers, allDrivers]);

  // Mutations
  const interventionMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) => ordersApi.adminIntervention(id, dto),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['order', updated.id] });
      showToast('success', 'تم تنفيذ الإجراء وتعديل بيانات الطلب بنجاح');
      setConfirmAction(null);
    },
    onError: (err: any) => {
      showToast('error', err.response?.data?.message || 'فشل تنفيذ الإجراء التعديلي');
      setConfirmAction(null);
    },
  });

  // Client side filtering for TanStack Table
  const filteredOrders = useMemo(() => {
    return allOrders.filter((o) => {
      // 1. Status Filter
      if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;

      // 2. Area/City Filter
      if (cityFilter !== 'ALL') {
        const orderCity = o.customer?.area?.city || o.business?.area?.city;
        if (orderCity !== cityFilter) return false;
      }
      if (villageFilter !== 'ALL') {
        if (o.customer?.area?.id !== villageFilter && o.business?.area?.id !== villageFilter) return false;
      }

      // 3. Date Range Filter
      if (startDate) {
        const orderDate = new Date(o.createdAt);
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (orderDate < start) return false;
      }
      if (endDate) {
        const orderDate = new Date(o.createdAt);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (orderDate > end) return false;
      }

      // 4. Text Search
      if (search) {
        const query = search.toLowerCase();
        const customerName = o.customer?.name?.toLowerCase() || '';
        const businessName = o.business?.name?.toLowerCase() || '';
        const orderId = o.id.toLowerCase();
        const shortId = `#${o.id.slice(-6).toUpperCase()}`;

        return (
          customerName.includes(query) ||
          businessName.includes(query) ||
          orderId.includes(query) ||
          shortId.includes(query)
        );
      }

      return true;
    });
  }, [allOrders, search, statusFilter, cityFilter, villageFilter, startDate, endDate]);

  // TanStack columns
  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: 'رقم الطلب',
        cell: (info) => (
          <span className="font-mono text-[13px] text-on-surface font-semibold">
            #{info.getValue().slice(-6).toUpperCase()}
          </span>
        ),
      }),
      columnHelper.accessor('customer.name', {
        header: 'الزبون',
        cell: (info) => (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
              {info.getValue()?.charAt(0) ?? '?'}
            </div>
            <div>
              <p className="text-[14px] font-semibold text-on-surface">{info.getValue() ?? '—'}</p>
              <p className="text-[11px] text-muted-gray" dir="ltr">
                {info.row.original.customer?.phone ?? ''}
              </p>
            </div>
          </div>
        ),
      }),
      columnHelper.accessor('business.name', {
        header: 'المتجر',
        cell: (info) => (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
              <span className="material-symbols-outlined text-[18px]">storefront</span>
            </div>
            <span className="text-[14px] font-semibold text-on-surface">{info.getValue() ?? '—'}</span>
          </div>
        ),
      }),
      columnHelper.accessor('total', {
        header: 'المجموع',
        cell: (info) => <span className="font-bold text-primary">₪{Number(info.getValue() ?? 0).toFixed(2)}</span>,
      }),
      columnHelper.accessor('paymentMethod', {
        header: 'طريقة الدفع',
        cell: (info) => (
          <span className="inline-flex rounded-full bg-surface-container px-3 py-1 text-[11px] font-medium border border-border">
            {info.getValue() === 'CASH' ? 'نقدي عند الاستلام' : 'دفع إلكتروني'}
          </span>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'الحالة',
        cell: (info) => (
          <span className={`inline-flex rounded-full px-3 py-1 text-[12px] font-bold border ${STATUS_COLOR[info.getValue()] ?? ''}`}>
            {STATUS_LABEL[info.getValue()] ?? info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('createdAt', {
        header: 'الوقت',
        cell: (info) => <span className="text-[11px] text-muted-gray">{timeAgo(info.getValue())}</span>,
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <div className="text-left">عرض</div>,
        cell: (info) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedOrderId(info.row.original.id);
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
    data: filteredOrders,
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
    if (!confirmAction || !selectedOrderId) return;
    const { type, payload } = confirmAction;

    let dto: any = {};
    if (type === 'status') dto.status = payload;
    if (type === 'driver') dto.driverId = payload;
    if (type === 'unassign') dto.driverId = null;
    if (type === 'payment') dto.paymentStatus = payload;

    interventionMutation.mutate({ id: selectedOrderId, dto });
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
            <h3 className="text-lg font-bold text-on-surface mb-2">تأكيد الإجراء التعديلي</h3>
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
                disabled={interventionMutation.isPending}
                className="h-11 px-6 rounded-xl bg-primary text-white font-bold text-[14px] shadow-md hover:brightness-95 disabled:opacity-50 transition-colors"
              >
                {interventionMutation.isPending ? 'جاري التنفيذ...' : 'تأكيد وحفظ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">إدارة الطلبات والتدخل السريع</h2>
          <p className="text-[13px] text-muted-gray mt-1">تتبع، خصص، تحكم بالطلبات وعدّلها لحظياً عبر الـ Sockets</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-secondary/15 px-4 py-2 border border-secondary/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
          </span>
          <span className="font-bold text-[13px] text-secondary">متصل بالبث المباشر</span>
        </div>
      </div>

      {/* Filters Dashboard */}
      <div className="rounded-2xl border border-border-beige bg-surface-white p-5 shadow-sm mt-margin-standard">
        <div className="space-y-4">
          {/* Status Tab Filters */}
          <div className="flex flex-wrap gap-1.5 border-b border-border pb-4">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`rounded-lg px-4 py-2 text-[13px] font-bold transition-all border ${
                statusFilter === 'ALL'
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-background/20 text-muted-gray border-transparent hover:text-on-surface hover:bg-background/30'
              }`}
            >
              الكل ({allOrders.length})
            </button>
            {Object.entries(STATUS_LABEL).map(([key, value]) => {
              const count = allOrders.filter((o) => o.status === key).length;
              return (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`rounded-lg px-4 py-2 text-[13px] font-bold transition-all border ${
                    statusFilter === key
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-background/20 text-muted-gray border-transparent hover:text-on-surface hover:bg-background/30'
                  }`}
                >
                  {value} ({count})
                </button>
              );
            })}
          </div>

          {/* Search, Area, Date Inputs */}
          <div className="grid grid-cols-1 items-end gap-gap-md sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2 lg:col-span-2">
              <label className="mr-1 block text-[12px] font-medium text-muted-gray">البحث عن طلب</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-muted-gray text-[20px]">
                  search
                </span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-11 pr-11 pl-4 bg-background/30 border border-border-beige rounded-xl focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-[14px]"
                  placeholder="رقم الطلب (#5d27c...)، اسم الزبون، المتجر..."
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
              <label className="mr-1 block text-[12px] font-medium text-muted-gray">تاريخ البداية</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-11 px-4 bg-background/30 border border-border-beige rounded-xl focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-[14px] text-right"
              />
            </div>

            <div className="space-y-2">
              <label className="mr-1 block text-[12px] font-medium text-muted-gray">تاريخ النهاية</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-11 px-4 bg-background/30 border border-border-beige rounded-xl focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-[14px] text-right"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="rounded-2xl border border-border-beige bg-surface-white shadow-sm mt-margin-standard overflow-hidden">
        {isOrdersLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-[14px] font-medium text-muted-gray">جاري جلب قائمة الطلبات الحية...</p>
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
                      onClick={() => setSelectedOrderId(row.original.id)}
                      className="group cursor-pointer transition-colors hover:bg-background/20"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-6 py-3.5">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-[48px] text-muted-gray/40">shopping_cart_off</span>
                          <h4 className="text-[16px] font-bold text-on-surface">لم يتم العثور على أي طلبات</h4>
                          <p className="text-[13px] text-muted-gray">جرب تغيير فلاتر البحث أو النطاق الزمني للمدينة</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="flex items-center justify-between border-t border-border bg-surface-container-low px-6 py-4">
              <p className="text-[13px] text-muted-gray">
                عرض {filteredOrders.length} طلب
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

      {/* Orders Details Slide Drawer (Left Drawer) */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 flex justify-start bg-on-surface/30 backdrop-blur-xs">
          {/* Backdrop closer */}
          <div className="absolute inset-0" onClick={() => setSelectedOrderId(null)} />

          {/* Drawer container */}
          <div className="relative w-full max-w-xl bg-surface-white h-screen shadow-2xl flex flex-col z-10 animate-slide-in border-r border-border" dir="rtl">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-border p-5 bg-background/10">
              <div>
                <h3 className="text-[18px] font-bold text-on-surface">تفاصيل الطلب والتحكم</h3>
                <p className="text-[11px] font-mono text-muted-gray mt-1">ID: {selectedOrderId}</p>
              </div>
              <button
                onClick={() => setSelectedOrderId(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-border/30 text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            {/* Drawer Content */}
            {isOrderDetailLoading || !selectedOrder ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-[13px] text-muted-gray">جاري جلب تفاصيل الطلب وتاريخ الحالات...</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Visual Interventions Alert */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <h4 className="flex items-center gap-2 text-[14px] font-bold text-primary mb-1.5">
                    <span className="material-symbols-outlined text-[20px]">bolt</span>
                    التدخل السريع للمشرف (Admin Override)
                  </h4>
                  <p className="text-[12px] text-muted-gray mb-4 leading-relaxed">
                    بصفتك مديراً للنظام، يمكنك تجاوز قيود دورة حياة الطلب القياسية وتعديل الحالات أو السائقين أو الدفع يدوياً.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Status Override */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface">تجاوز حالة الطلب</label>
                      <select
                        value={selectedOrder.status}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConfirmAction({
                            type: 'status',
                            payload: val,
                            message: `هل أنت متأكد من تغيير حالة الطلب يدوياً من "${STATUS_LABEL[selectedOrder.status]}" إلى "${STATUS_LABEL[val]}"؟ سيؤدي هذا لتجاوز قيود المنشآت والسائقين.`,
                          });
                        }}
                        className="w-full h-10 px-2 bg-surface border border-border-beige rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none text-[12px] font-bold cursor-pointer"
                      >
                        {Object.entries(STATUS_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Payment Status Override */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface">تجاوز حالة الدفع</label>
                      <select
                        value={selectedOrder.payment?.status ?? 'PENDING'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConfirmAction({
                            type: 'payment',
                            payload: val,
                            message: `هل أنت متأكد من تغيير حالة الدفع لهذا الطلب يدوياً إلى "${PAYMENT_STATUS_LABEL[val]}"؟`,
                          });
                        }}
                        className="w-full h-10 px-2 bg-surface border border-border-beige rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none text-[12px] font-bold cursor-pointer"
                      >
                        {Object.entries(PAYMENT_STATUS_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Driver Override */}
                    <div className="col-span-2 space-y-1.5 pt-2 border-t border-border/60">
                      <label className="text-[11px] font-bold text-on-surface block">إسناد الطلب لسائق يدوي</label>
                      <div className="flex gap-2">
                        <select
                          id="driverSelect"
                          className="flex-1 h-10 px-3 bg-surface border border-border-beige rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none text-[12px] font-semibold cursor-pointer"
                        >
                          <option value="">اختر سائقاً من القائمة...</option>
                          {driversList.map((d: Driver) => (
                            <option key={d.id} value={d.id}>
                              {d.user?.name ?? 'بدون اسم'} ({d.area?.name ?? 'بدون منطقة'}) - {d.status === 'AVAILABLE' ? 'متاح' : 'مشغول'}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            const select = document.getElementById('driverSelect') as HTMLSelectElement;
                            const dId = select?.value;
                            if (!dId) return showToast('error', 'الرجاء اختيار سائق أولاً للإسناد');
                            const drName = driversList.find((d) => d.id === dId)?.user?.name ?? 'السائق';
                            setConfirmAction({
                              type: 'driver',
                              payload: dId,
                              message: `هل تريد إسناد وتعيين الطلب يدوياً للسائق "${drName}"؟ سيؤدي هذا لتجاوز الترشيحات الآلية وإسناده مباشرة.`,
                            });
                          }}
                          className="h-10 px-4 rounded-lg bg-primary text-white text-[12px] font-bold hover:brightness-95 transition-all shadow-sm"
                        >
                          تعيين
                        </button>
                        {selectedOrder.driverId && (
                          <button
                            onClick={() => {
                              setConfirmAction({
                                type: 'unassign',
                                payload: null,
                                message: 'هل أنت متأكد من إلغاء تعيين السائق تماماً؟ سيعود الطلب بدون سائق.',
                              });
                            }}
                            className="h-10 px-3 rounded-lg border border-error/30 text-error hover:bg-error/5 text-[12px] font-bold transition-all"
                          >
                            إلغاء الإسناد
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-gray">
                        * تعرض القائمة السائقين المتاحين في منطقة الزبون أولاً. في حال عدم وجودهم، تعرض كافة سائقي النظام.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section: Status Badge & Basic Info */}
                <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
                  <div>
                    <p className="text-[12px] text-muted-gray">حالة الطلب</p>
                    <span className={`inline-flex rounded-full px-3 py-1 text-[12px] font-bold border mt-1 ${STATUS_COLOR[selectedOrder.status] ?? ''}`}>
                      {STATUS_LABEL[selectedOrder.status]}
                    </span>
                  </div>
                  <div>
                    <p className="text-[12px] text-muted-gray">قيمة الدفع وحالته</p>
                    <div className="flex gap-2 items-center mt-1">
                      <span className="font-bold text-[14px]">₪{Number(selectedOrder.total ?? 0).toFixed(2)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold border ${PAYMENT_STATUS_COLOR[selectedOrder.payment?.status ?? 'PENDING']}`}>
                        {PAYMENT_STATUS_LABEL[selectedOrder.payment?.status ?? 'PENDING']}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section: Customer & Business Cards */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Customer Card */}
                  <div className="rounded-xl border border-border p-4 bg-surface space-y-2">
                    <h5 className="flex items-center gap-1.5 text-[13px] font-bold text-on-surface pb-1.5 border-b border-border">
                      <span className="material-symbols-outlined text-[18px] text-primary">person</span>
                      معلومات الزبون
                    </h5>
                    <p className="text-[13px] font-bold text-on-surface">{selectedOrder.customer?.name ?? '—'}</p>
                    <p className="text-[12px] text-muted-gray" dir="ltr">{selectedOrder.customer?.phone ?? '—'}</p>
                    {/* Snap Address Block */}
                    <div className="bg-primary/5 rounded-lg p-2 border border-primary/10 mt-1">
                      <p className="text-[11px] font-bold text-primary">عنوان التوصيل (Snapshot)</p>
                      <p className="text-[12px] text-on-surface font-semibold mt-0.5">
                        {selectedOrder.deliveryAreaName || selectedOrder.customer?.area?.name || 'المنطقة الافتراضية'}
                      </p>
                      <p className="text-[11px] text-muted-gray mt-0.5">
                        {selectedOrder.deliveryAddressDetail || 'لا يوجد تفاصيل تفصيلية للعنوان'}
                      </p>
                    </div>
                  </div>

                  {/* Business Card */}
                  <div className="rounded-xl border border-border p-4 bg-surface space-y-2">
                    <h5 className="flex items-center gap-1.5 text-[13px] font-bold text-on-surface pb-1.5 border-b border-border">
                      <span className="material-symbols-outlined text-[18px] text-secondary">storefront</span>
                      معلومات المتجر
                    </h5>
                    <p className="text-[13px] font-bold text-on-surface">{selectedOrder.business?.name ?? '—'}</p>
                    <p className="text-[12px] text-muted-gray" dir="ltr">{selectedOrder.business?.owner?.phone ?? '—'}</p>
                    <p className="text-[11px] text-muted-gray">
                      المنطقة: {selectedOrder.business?.area?.city ?? '—'} - {selectedOrder.business?.area?.name ?? ''}
                    </p>
                  </div>
                </div>

                {/* Section: Driver info */}
                <div className="rounded-xl border border-border p-4 bg-surface space-y-2">
                  <h5 className="flex items-center gap-1.5 text-[13px] font-bold text-on-surface pb-1.5 border-b border-border">
                    <span className="material-symbols-outlined text-[18px] text-tertiary">local_shipping</span>
                    عامل التوصيل المعيّن
                  </h5>
                  {selectedOrder.driver ? (
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[13px] font-bold text-on-surface">
                          {selectedOrder.driver.user?.name ?? '—'}
                        </p>
                        <p className="text-[12px] text-muted-gray" dir="ltr">
                          {selectedOrder.driver.user?.phone ?? '—'}
                        </p>
                        <p className="text-[11px] text-muted-gray mt-0.5">
                          المنطقة: {selectedOrder.driver.area?.name ?? '—'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-warning-amber">
                        <span className="material-symbols-outlined text-[18px]">star</span>
                        <span className="text-[13px] font-bold">
                          {Number(selectedOrder.driver.rating ?? 0).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[12px] text-muted-gray py-2 text-center">
                      لم يتم تعيين أي سائق لهذا الطلب بعد.
                    </p>
                  )}
                </div>

                {/* Section: Order items breakdown */}
                <div className="rounded-xl border border-border p-4 bg-surface space-y-3">
                  <h5 className="flex items-center gap-1.5 text-[13px] font-bold text-on-surface pb-1.5 border-b border-border">
                    <span className="material-symbols-outlined text-[18px] text-primary">shopping_basket</span>
                    تفاصيل الفاتورة والعناصر المطلوبة
                  </h5>
                  <div className="space-y-2.5">
                    {selectedOrder.items?.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-[13px] bg-background/10 rounded-lg p-2.5 border border-border/40">
                        <div>
                          <p className="font-bold text-on-surface">{item.product?.name ?? 'منتج غير معروف'}</p>
                          {item.product?.description && (
                            <p className="text-[10px] text-muted-gray mt-0.5 leading-relaxed">{item.product.description}</p>
                          )}
                        </div>
                        <div className="text-left font-mono">
                          <span>{item.quantity}x</span>
                          <span className="text-muted-gray mx-1">@</span>
                          <span className="font-bold text-primary">₪{Number(item.unitPrice ?? 0).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary Total box */}
                  <div className="pt-3 border-t border-border space-y-2 text-[13px]">
                    <div className="flex justify-between text-muted-gray">
                      <span>المجموع الفرعي:</span>
                      <span className="font-mono">₪{(Number(selectedOrder.total ?? 0) - Number(selectedOrder.business?.area?.deliveryFee || 3)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-gray">
                      <span>رسوم التوصيل:</span>
                      <span className="font-mono">₪{Number(selectedOrder.business?.area?.deliveryFee || 3).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-on-surface font-extrabold text-[15px] pt-1.5 border-t border-border/60">
                      <span>الإجمالي الكلي:</span>
                      <span className="font-mono text-primary">₪{Number(selectedOrder.total ?? 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Section: Status History Timeline */}
                <div className="rounded-xl border border-border p-4 bg-surface space-y-4">
                  <h5 className="flex items-center gap-1.5 text-[13px] font-bold text-on-surface pb-1.5 border-b border-border">
                    <span className="material-symbols-outlined text-[18px] text-secondary">history</span>
                    سجل حالات الطلب (Audit Timeline)
                  </h5>
                  <div className="relative pl-1 pr-6 space-y-5 border-r border-border/80 mr-3">
                    {selectedOrder.statusHistory?.map((h, i) => (
                      <div key={h.status + i} className="relative">
                        {/* Timeline Node Point */}
                        <div className={`absolute right-[-28px] top-1 h-3.5 w-3.5 rounded-full border-2 bg-white flex items-center justify-center ${
                          i === (selectedOrder.statusHistory?.length ?? 0) - 1
                            ? 'border-primary ring-4 ring-primary/10'
                            : 'border-muted-gray'
                        }`} />
                        <div>
                          <p className="text-[13px] font-bold text-on-surface">
                            {STATUS_LABEL[h.status] ?? h.status}
                          </p>
                          <p className="text-[11px] text-muted-gray mt-0.5 leading-relaxed">
                            بواسطة: {h.changedBy?.startsWith('ADMIN:') ? (
                              <span className="text-primary font-bold">{h.changedBy}</span>
                            ) : h.changedBy ?? 'النظام'}
                          </p>
                          <p className="text-[10px] text-muted-gray font-mono mt-0.5">
                            {new Date(h.createdAt).toLocaleString('ar-PS')}
                          </p>
                        </div>
                      </div>
                    ))}
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
