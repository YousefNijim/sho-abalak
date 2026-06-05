'use client';

import { useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { ordersApi, usersApi, businessesApi, driversApi, BASE_URL } from '@shu/api-client';
import type { Order } from '@shu/api-client';
import { getToken } from '@/lib/auth';
import { io } from 'socket.io-client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  useReactTable,
  getCoreRowModel,
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

const PIE_COLORS = ['#E6781E', '#165A34'];

const columnHelper = createColumnHelper<Order>();

export default function DashboardPage() {
  const qc = useQueryClient();

  // Socket sync for live metrics
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = io(BASE_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('order:new', () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    });

    socket.on('order:status_update', () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    });

    socket.on('driver:status_change', () => {
      qc.invalidateQueries({ queryKey: ['drivers'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [qc]);

  // Queries
  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => businessesApi.list(),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => driversApi.list(),
  });

  // KPI Calculations
  const todayOrders = useMemo(() => {
    const now = new Date();
    return orders.filter((o) => {
      const d = new Date(o.createdAt);
      return (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    });
  }, [orders]);

  const todayRevenue = useMemo(() => {
    return todayOrders
      .filter((o) => o.status === 'DELIVERED')
      .reduce((sum, o) => sum + Number(o.total ?? 0), 0);
  }, [todayOrders]);

  const activeCustomers = useMemo(() => users.filter((u) => u.role === 'CUSTOMER').length, [users]);
  const activeBusinesses = useMemo(() => businesses.length, [businesses]);
  const onlineDrivers = useMemo(() => drivers.filter((d) => d.status !== 'OFFLINE').length, [drivers]);

  // Quick Alerts
  // 1. Stuck orders: PENDING for > 15m, or CONFIRMED/PREPARING/READY for > 30m
  const stuckOrders = useMemo(() => {
    const now = Date.now();
    return orders.filter((o) => {
      if (['DELIVERED', 'CANCELLED'].includes(o.status)) return false;
      const ageMs = now - new Date(o.createdAt).getTime();
      const ageMins = ageMs / 60000;

      if (o.status === 'PENDING' && ageMins > 15) return true;
      if (['CONFIRMED', 'PREPARING', 'READY'].includes(o.status) && ageMins > 30) return true;
      return false;
    });
  }, [orders]);

  // 2. Pending business registration approvals (let's assume business where isOpen is false as mock)
  const pendingApprovals = useMemo(() => {
    return businesses.filter((b) => !b.isOpen).length;
  }, [businesses]);

  const recentOrders = useMemo(() => orders.slice(0, 10), [orders]);

  // Chart data aggregates
  const weeklyData = useMemo(() => buildWeekly(orders), [orders]);
  const monthlyData = useMemo(() => buildMonthly(orders), [orders]);

  const paymentSplitData = useMemo(() => {
    const cashCount = orders.filter((o) => o.paymentMethod === 'CASH').length;
    const electronicCount = orders.filter((o) => o.paymentMethod === 'ELECTRONIC').length;
    return [
      { name: 'دفع نقدي', value: cashCount },
      { name: 'دفع إلكتروني', value: electronicCount },
    ];
  }, [orders]);

  // TanStack table definitions
  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: 'رقم الطلب',
        cell: (info) => `#${info.getValue().slice(-6).toUpperCase()}`,
      }),
      columnHelper.accessor('customer.name', {
        header: 'الزبون',
        cell: (info) => (
          <div className="flex items-center gap-gap-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
              {info.getValue()?.charAt(0) ?? '?'}
            </div>
            <span>{info.getValue() ?? '—'}</span>
          </div>
        ),
      }),
      columnHelper.accessor('business.name', {
        header: 'المتجر',
        cell: (info) => info.getValue() ?? '—',
      }),
      columnHelper.accessor('total', {
        header: 'المجموع',
        cell: (info) => <span className="font-bold text-primary">₪{Number(info.getValue() ?? 0).toFixed(2)}</span>,
      }),
      columnHelper.accessor('status', {
        header: 'الحالة',
        cell: (info) => <StatusBadge label={STATUS_LABEL[info.getValue()] ?? info.getValue()} />,
      }),
      columnHelper.accessor('createdAt', {
        header: 'الوقت',
        cell: (info) => <span className="text-[11px] text-muted-gray">{timeAgo(info.getValue())}</span>,
      }),
    ],
    []
  );

  const table = useReactTable({
    data: recentOrders,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      {/* Stuck Orders and Approvals Banner Alerts */}
      {(stuckOrders.length > 0 || pendingApprovals > 0) && (
        <div className="space-y-3 mb-margin-standard">
          {stuckOrders.length > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-error/20 bg-error/5 p-4 text-error" dir="rtl">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[24px] animate-pulse">warning</span>
                <div>
                  <h4 className="font-bold text-[14px]">تنبيه الطلبات العالقة / المتأخرة!</h4>
                  <p className="text-[12px] text-muted-gray mt-0.5">
                    هناك {stuckOrders.length} طلبات قيد الانتظار أو التحضير تجاوزت المهلة المحددة بدون استلام.
                  </p>
                </div>
              </div>
              <button
                onClick={() => window.location.href = '/orders'}
                className="h-9 px-4 rounded-lg bg-error text-white font-bold text-[12px] shadow-sm hover:brightness-95 transition-all"
              >
                التدخل الفوري
              </button>
            </div>
          )}

          {pendingApprovals > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-warning-amber/20 bg-warning-amber/5 p-4 text-warning-amber" dir="rtl">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[24px]">verified_user</span>
                <div>
                  <h4 className="font-bold text-[14px]">مراجعة التسجيلات الجديدة للمتاجر</h4>
                  <p className="text-[12px] text-muted-gray mt-0.5">
                    هناك {pendingApprovals} متاجر جديدة مغلقة وبانتظار موافقة الإدارة وتفعيل عمولة المنصة.
                  </p>
                </div>
              </div>
              <button
                onClick={() => window.location.href = '/businesses'}
                className="h-9 px-4 rounded-lg bg-warning-amber text-white font-bold text-[12px] shadow-sm hover:brightness-95 transition-all"
              >
                مراجعة واعتماد
              </button>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-margin-standard sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="shopping_basket" label="طلبات اليوم" value={String(todayOrders.length)} tone="primary" />
        <StatCard icon="payments" label="إيرادات اليوم المقبولة" value={`₪${Number(todayRevenue).toFixed(0)}`} tone="secondary" />
        <StatCard icon="person_add" label="الزبائن والشركاء" value={`👤 ${activeCustomers} | 🏪 ${activeBusinesses}`} tone="tertiary" />
        <StatCard icon="local_shipping" label="السائقين المتصلين حالياً" value={String(onlineDrivers)} tone="warning-amber" />
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 gap-margin-standard lg:grid-cols-3 mt-margin-standard">
        {/* Weekly orders */}
        <div className="rounded-xl border border-border-beige bg-surface-white p-5 shadow-sm h-[320px] lg:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-on-surface">نشاط الطلبات الأسبوعية</h3>
            <span className="material-symbols-outlined text-primary text-[20px]">trending_up</span>
          </div>
          <div className="h-[220px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" fill="#E6781E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly orders count */}
        <div className="rounded-xl border border-border-beige bg-surface-white p-5 shadow-sm h-[320px] lg:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-on-surface">إيرادات المنصة الشهرية</h3>
            <span className="material-symbols-outlined text-secondary text-[20px]">bar_chart</span>
          </div>
          <div className="h-[220px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" fill="#165A34" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Split */}
        <div className="rounded-xl border border-border-beige bg-surface-white p-5 shadow-sm h-[320px] lg:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-on-surface">توزيع وسائل الدفع</h3>
            <span className="material-symbols-outlined text-tertiary text-[20px]">pie_chart</span>
          </div>
          <div className="h-[220px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentSplitData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentSplitData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="mt-margin-standard overflow-hidden rounded-xl border border-border-beige bg-surface-white shadow-sm">
        <div className="flex items-center justify-between border-b border-border-beige p-6">
          <div>
            <h3 className="text-[18px] font-bold text-on-surface">أحدث المعاملات والطلبات</h3>
            <p className="text-[12px] text-muted-gray mt-0.5">مراقبة حية لحظية لأحدث 10 طلبات تجري على المنصة</p>
          </div>
          <button
            onClick={() => window.location.href = '/orders'}
            className="flex items-center gap-gap-sm text-[14px] font-bold text-primary hover:underline border border-primary/20 px-4 py-2 rounded-lg"
          >
            مركز التحكم بالطلبات
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          </button>
        </div>
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
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-gray">
                    لا توجد طلبات جارية حالياً
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function buildWeekly(orders: Order[]): { day: string; value: number }[] {
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    const count = orders.filter((o) => {
      const od = new Date(o.createdAt);
      return od.toDateString() === d.toDateString();
    }).length;
    return { day: DAYS_AR[d.getDay()]!, value: count };
  });
}

function buildMonthly(orders: Order[]): { month: string; value: number }[] {
  const now = new Date();
  return Array.from({ length: 4 }, (_, i) => {
    const m = (now.getMonth() - (3 - i) + 12) % 12;
    const count = orders.filter((o) => new Date(o.createdAt).getMonth() === m).length;
    return { month: MONTHS_AR[m]!, value: count };
  });
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  return `منذ ${Math.floor(diff / 86400)} يوم`;
}
