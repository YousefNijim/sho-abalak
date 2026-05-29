'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { ordersApi, usersApi, businessesApi } from '@shu/api-client';
import type { Order } from '@shu/api-client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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

const columnHelper = createColumnHelper<Order>();

export default function DashboardPage() {
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

  const todayOrders = orders.filter((o: Order) => {
    const d = new Date(o.createdAt);
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  });

  const todayRevenue = todayOrders
    .filter((o: Order) => o.status === 'DELIVERED')
    .reduce((s: number, o: Order) => s + o.total, 0);

  const activeBusinesses = businesses.filter((b: { isOpen: boolean }) => b.isOpen).length;
  const recentOrders = useMemo(() => orders.slice(0, 10), [orders]);

  const weeklyData = useMemo(() => buildWeekly(orders), [orders]);
  const monthlyData = useMemo(() => buildMonthly(orders), [orders]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: 'رقم الطلب',
        cell: (info) => `#${info.getValue().slice(0, 8)}`,
      }),
      columnHelper.accessor('customer.name', {
        header: 'الزبون',
        cell: (info) => (
          <div className="flex items-center gap-gap-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-outline-variant text-xs">
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
        cell: (info) => <span className="font-bold">₪{info.getValue().toFixed(2)}</span>,
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
      {/* Stats */}
      <div className="grid grid-cols-1 gap-margin-standard sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="shopping_basket" label="طلبات اليوم" value={String(todayOrders.length)} tone="primary" />
        <StatCard icon="payments" label="الإيراد اليومي" value={`₪${todayRevenue.toFixed(0)}`} tone="secondary" />
        <StatCard icon="person_add" label="إجمالي المستخدمين" value={String(users.length)} tone="tertiary" />
        <StatCard icon="store" label="متاجر مفتوحة" value={String(activeBusinesses)} tone="warning-amber" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-margin-standard lg:grid-cols-2 mt-margin-standard">
        {/* Weekly orders */}
        <div className="rounded-xl border border-border-beige bg-surface-white p-6 shadow-sm h-[320px]">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-on-surface">الطلبات الأسبوعية</h3>
            <span className="material-symbols-outlined text-primary">trending_up</span>
          </div>
          <div className="h-[200px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" fill="#E6781E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly orders count */}
        <div className="rounded-xl border border-border-beige bg-surface-white p-6 shadow-sm h-[320px]">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-on-surface">الإيرادات الشهرية</h3>
            <span className="material-symbols-outlined text-secondary">bar_chart</span>
          </div>
          <div className="h-[200px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" fill="#165A34" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="mt-margin-standard overflow-hidden rounded-xl border border-border-beige bg-surface-white shadow-sm">
        <div className="flex items-center justify-between border-b border-border-beige p-6">
          <h3 className="text-xl font-semibold text-on-surface">آخر الطلبات</h3>
          <button className="flex items-center gap-gap-sm text-[16px] font-bold text-primary hover:underline">
            عرض الكل
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-right">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-surface-container-low text-[13px] text-muted-gray">
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-6 py-4 font-medium">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border-beige">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-surface-container-lowest">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4 text-[13px]">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-gray">
                    لا توجد طلبات بعد
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
