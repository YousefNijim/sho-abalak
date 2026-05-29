'use client';

import { useQuery } from '@tanstack/react-query';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { ordersApi, usersApi, businessesApi } from '@shu/api-client';
import type { Order } from '@shu/api-client';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'معلق',
  CONFIRMED: 'مؤكد',
  PREPARING: 'جاري التحضير',
  READY: 'جاهز',
  PICKED_UP: 'في الطريق',
  DELIVERED: 'مكتمل',
  CANCELLED: 'ملغي',
};

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
  const recentOrders = orders.slice(0, 10);

  // Build chart data from real orders (last 7 days)
  const weeklyData = buildWeekly(orders);
  const maxWeekly = Math.max(...weeklyData.map((d) => d.value), 1);

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
      <div className="grid grid-cols-1 gap-margin-standard lg:grid-cols-2">
        {/* Weekly orders */}
        <div className="rounded-xl border border-border-beige bg-surface-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-on-surface">الطلبات الأسبوعية</h3>
            <span className="material-symbols-outlined text-primary">trending_up</span>
          </div>
          <div className="flex h-[200px] items-end justify-between gap-gap-sm px-2">
            {weeklyData.map((d, i) => (
              <div
                key={d.day}
                className={`flex-1 rounded-t-lg ${i === weeklyData.length - 1 ? 'bg-primary' : 'bg-surface-container'}`}
                style={{ height: `${Math.round((d.value / maxWeekly) * 100)}%` }}
              />
            ))}
          </div>
          <div className="mt-4 flex justify-between text-[11px] text-muted-gray">
            {weeklyData.map((d) => (
              <span key={d.day}>{d.day}</span>
            ))}
          </div>
        </div>

        {/* Monthly orders count */}
        <div className="rounded-xl border border-border-beige bg-surface-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-on-surface">الإيرادات الشهرية</h3>
            <span className="material-symbols-outlined text-secondary">bar_chart</span>
          </div>
          <div className="flex h-[200px] items-end justify-between gap-gap-md px-4">
            {buildMonthly(orders).map((d, i, arr) => (
              <div
                key={d.month}
                className={`w-full rounded-md transition-all hover:brightness-95 ${
                  i === arr.length - 1 ? 'bg-secondary' : 'bg-secondary-container'
                }`}
                style={{ height: `${Math.round((d.value / (Math.max(...arr.map((x) => x.value), 1))) * 100)}%` }}
              />
            ))}
          </div>
          <div className="mt-4 flex justify-between text-[11px] text-muted-gray">
            {buildMonthly(orders).map((d) => (
              <span key={d.month} className="w-full text-center">
                {d.month}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="overflow-hidden rounded-xl border border-border-beige bg-surface-white shadow-sm">
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
              <tr className="bg-surface-container-low text-[13px] text-muted-gray">
                <th className="px-6 py-4 font-medium">رقم الطلب</th>
                <th className="px-6 py-4 font-medium">الزبون</th>
                <th className="px-6 py-4 font-medium">المتجر</th>
                <th className="px-6 py-4 font-medium">المجموع</th>
                <th className="px-6 py-4 font-medium">الحالة</th>
                <th className="px-6 py-4 font-medium">الوقت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-beige">
              {recentOrders.map((o: Order) => (
                <tr key={o.id} className="transition-colors hover:bg-surface-container-lowest">
                  <td className="px-6 py-4 text-[13px]">#{o.id.slice(0, 8)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-gap-sm">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-outline-variant text-xs">
                        {o.customer?.name?.charAt(0) ?? '?'}
                      </div>
                      <span>{o.customer?.name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">{o.business?.name ?? '—'}</td>
                  <td className="px-6 py-4 font-bold">₪{o.total.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <StatusBadge label={STATUS_LABEL[o.status] ?? o.status} />
                  </td>
                  <td className="px-6 py-4 text-[11px] text-muted-gray">
                    {timeAgo(o.createdAt)}
                  </td>
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
