'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@shu/api-client';
import { StatCard } from '@/components/stat-card';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';

const PERIODS = [
  { id: 'today', label: 'اليوم' },
  { id: 'week', label: 'الأسبوع' },
  { id: 'month', label: 'الشهر' },
  { id: 'custom', label: 'مخصص' },
] as const;

interface ReportOrder {
  id: string;
  businessName: string;
  customerName: string;
  total: number;
  commission: number;
  deliveryFee: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

const columnHelper = createColumnHelper<ReportOrder>();

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'معلق',
  CONFIRMED: 'مؤكد',
  PREPARING: 'جاري التحضير',
  READY: 'جاهز',
  PICKED_UP: 'في الطريق',
  DELIVERED: 'مكتمل / مُسوّى',
  CANCELLED: 'ملغي',
};

export default function ReportsPage() {
  const [period, setPeriod] = useState<string>('month');

  // Custom date range states
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Queries
  const { data: financeData, isLoading } = useQuery({
    queryKey: ['financeSummary', period, startDate, endDate],
    queryFn: () =>
      reportsApi.getFinanceSummary({
        period,
        startDate: period === 'custom' ? startDate : undefined,
        endDate: period === 'custom' ? endDate : undefined,
      }),
    enabled: period !== 'custom' || (!!startDate && !!endDate),
  });

  const summary = useMemo(() => {
    return financeData?.summary ?? {
      totalSales: 0,
      commission: 0,
      deliveryFees: 0,
      netRevenue: 0,
      ordersCount: 0,
      deliveredCount: 0,
      cancelledCount: 0,
    };
  }, [financeData]);

  const orders = useMemo(() => {
    return financeData?.orders ?? [];
  }, [financeData]);

  // Statistics cards layout
  const CARDS = [
    {
      label: 'إجمالي المبيعات للطلبات المكتملة',
      value: `₪${summary.totalSales.toLocaleString('ar-PS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: 'payments',
      tone: 'primary' as const,
    },
    {
      label: 'عمولة المنصة الإجمالية المكتسبة',
      value: `₪${summary.commission.toLocaleString('ar-PS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: 'percent',
      tone: 'secondary' as const,
    },
    {
      label: 'رسوم التوصيل الإجمالية للكباتن',
      value: `₪${summary.deliveryFees.toLocaleString('ar-PS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: 'local_shipping',
      tone: 'tertiary' as const,
    },
    {
      label: 'صافي إيرادات المتاجر الشريكة',
      value: `₪${summary.netRevenue.toLocaleString('ar-PS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: 'account_balance',
      tone: 'warning-amber' as const,
    },
  ];

  // TanStack table definitions
  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: 'رقم المعاملة',
        cell: (info) => `#${info.getValue().slice(0, 8)}`,
      }),
      columnHelper.accessor('businessName', {
        header: 'اسم المتجر الشريك',
        cell: (info) => <span className="font-bold text-on-surface">{info.getValue()}</span>,
      }),
      columnHelper.accessor('customerName', {
        header: 'الزبون',
        cell: (info) => <span className="text-muted-gray">{info.getValue()}</span>,
      }),
      columnHelper.accessor('total', {
        header: 'قيمة الفاتورة الإجمالية',
        cell: (info) => <span className="font-bold text-primary">₪{Number(info.getValue() ?? 0).toFixed(2)}</span>,
      }),
      columnHelper.accessor('commission', {
        header: 'عمولة المنصة المستقطعة',
        cell: (info) => (
          <span className="font-bold text-secondary">
            {info.row.original.status === 'DELIVERED' ? `₪${Number(info.getValue() ?? 0).toFixed(2)}` : '₪0.00'}
          </span>
        ),
      }),
      columnHelper.accessor('deliveryFee', {
        header: 'رسوم التوصيل',
        cell: (info) => <span className="text-muted-gray font-semibold">₪{Number(info.getValue() ?? 0).toFixed(2)}</span>,
      }),
      columnHelper.accessor('paymentMethod', {
        header: 'طريقة الدفع',
        cell: (info) => (
          <span className="rounded-full bg-surface-container px-3 py-1 text-[11px] font-bold text-on-surface">
            {info.getValue() === 'CASH' ? 'نقدي عند الاستلام' : 'دفع إلكتروني'}
          </span>
        ),
      }),
      columnHelper.accessor('createdAt', {
        header: 'تاريخ وتوقيت الطلب',
        cell: (info) => (
          <span className="text-[11px] text-muted-gray" dir="ltr">
            {new Date(info.getValue()).toLocaleString('ar-PS')}
          </span>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'الحالة المالية',
        cell: (info) => {
          const isDelivered = info.getValue() === 'DELIVERED';
          return (
            <span
              className="rounded-full px-3 py-1 text-[11px] font-bold"
              style={
                isDelivered
                  ? { backgroundColor: '#D1FAE5', color: '#065F46' }
                  : { backgroundColor: '#FEF3C7', color: '#92400E' }
              }
            >
              {isDelivered ? 'مُسوّى / مقبوض' : STATUS_LABEL[info.getValue()] || info.getValue()}
            </span>
          );
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data: orders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  // Export to CSV generator
  const handleExport = () => {
    if (orders.length === 0) return;
    const headers = [
      'رقم المعاملة',
      'المتجر الشريك',
      'الزبون',
      'قيمة الطلب الاجمالية',
      'عمولة المنصة',
      'رسوم التوصيل',
      'طريقة الدفع',
      'التاريخ والوقت',
      'الحالة',
    ];
    const rows = orders.map((o) => [
      `#${o.id}`,
      o.businessName,
      o.customerName,
      o.total,
      o.status === 'DELIVERED' ? o.commission : 0,
      o.deliveryFee,
      o.paymentMethod === 'CASH' ? 'نقدي' : 'إلكتروني',
      new Date(o.createdAt).toLocaleString('ar-PS'),
      o.status === 'DELIVERED' ? 'مسوى' : 'معلق',
    ]);

    const csvContent =
      '\ufeff' + // Add BOM for Excel UTF-8 Arabic encoding
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `تقرير_مالي_${period}_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {/* Header section */}
      <div className="flex flex-wrap items-center justify-between gap-gap-md" dir="rtl">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">التقارير المالية والحسابات</h2>
          <p className="text-[12px] text-muted-gray mt-0.5">تتبع أرباح المتاجر، عمولات المنصة، ومستحقات الكباتن وتصدير المعاملات</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Period Selector Tabs */}
          <div className="flex gap-1 rounded-xl border border-border-beige bg-surface-white p-1">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`rounded-lg px-4 py-2 text-[13px] font-bold transition-colors ${
                  period === p.id ? 'bg-primary text-white' : 'text-muted-gray hover:text-on-surface'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={orders.length === 0}
            className="flex h-11 items-center gap-gap-sm rounded-xl border border-border-beige bg-surface-white px-5 font-bold text-on-surface shadow-sm transition-all hover:bg-surface-container disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-secondary">download</span>
            تصدير CSV
          </button>
        </div>
      </div>

      {/* Custom Date Range Selectors if active */}
      {period === 'custom' && (
        <div className="mt-4 flex flex-wrap gap-4 rounded-xl border border-border-beige bg-surface-white p-4 items-center justify-end" dir="rtl">
          <span className="text-[12px] font-bold text-on-surface ml-auto">اختر النطاق الزمني المخصص:</span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-gray">من</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 rounded-lg border border-border-beige px-3 text-[13px] text-on-surface focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-gray">إلى</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 rounded-lg border border-border-beige px-3 text-[13px] text-on-surface focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Statistics aggregate Cards */}
      <div className="grid grid-cols-1 gap-margin-standard sm:grid-cols-2 lg:grid-cols-4 mt-margin-standard" dir="rtl">
        {CARDS.map((c) => (
          <StatCard key={c.label} icon={c.icon} label={c.label} value={c.value} tone={c.tone} />
        ))}
      </div>

      {/* Transactions Grid */}
      <div className="rounded-xl border border-border-beige bg-surface-white p-6 shadow-sm mt-margin-standard" dir="rtl">
        <div className="mb-4 flex items-center justify-between border-b border-border-beige pb-4">
          <div>
            <h3 className="text-[16px] font-bold text-on-surface">قائمة القيود والمعاملات التفصيلية</h3>
            <p className="text-[12px] text-muted-gray mt-0.5">تفصيل كافة المعاملات والعمولات المستقطعة للفترة المحددة</p>
          </div>
          <span className="rounded-lg bg-surface-container px-3 py-1.5 text-[12px] font-bold text-muted-gray">
            إجمالي المعاملات: {summary.ordersCount} طلب | المكتملة: {summary.deliveredCount} | الملغاة: {summary.cancelledCount}
          </span>
        </div>

        {/* TanStack Datatable */}
        {isLoading ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-muted-gray">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span className="text-[13px] font-bold">جاري تحميل تجميعات التقارير المالية...</span>
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
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-muted-gray">
                      {period === 'custom' && (!startDate || !endDate)
                        ? 'الرجاء اختيار نطاق تاريخي صحيح لبدء جلب البيانات المخصصة'
                        : 'لا توجد أي معاملات مسجلة في هذا النطاق الزمني المحدد'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {orders.length > 0 && (
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
    </>
  );
}
