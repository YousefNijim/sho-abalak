import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';

const WEEKLY = [
  { day: 'السبت', value: 60 },
  { day: 'الأحد', value: 80 },
  { day: 'الاثنين', value: 95 },
  { day: 'الثلاثاء', value: 70 },
  { day: 'الأربعاء', value: 85 },
  { day: 'الخميس', value: 55 },
  { day: 'الجمعة', value: 75 },
];

const MONTHLY = [
  { month: 'سبتمبر', value: 40 },
  { month: 'أكتوبر', value: 65 },
  { month: 'نوفمبر', value: 90 },
  { month: 'ديسمبر', value: 75 },
];

const ORDERS = [
  { id: '#ORD-9421', customer: 'سامي علي', business: 'مطعم الشام', total: '₪85.00', status: 'مكتمل', time: 'منذ 5 دقائق' },
  { id: '#ORD-9420', customer: 'نور حسين', business: 'برجر هاوس', total: '₪120.50', status: 'قيد التنفيذ', time: 'منذ 12 دقيقة' },
  { id: '#ORD-9419', customer: 'مريم يوسف', business: 'حلويات القدس', total: '₪45.00', status: 'ملغي', time: 'منذ 18 دقيقة' },
  { id: '#ORD-9418', customer: 'خالد إبراهيم', business: 'بيتزا إيطالية', total: '₪65.00', status: 'في الطريق', time: 'منذ 25 دقيقة' },
];

export default function DashboardPage() {
  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-1 gap-margin-standard sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="shopping_basket" label="إجمالي الطلبات" value="1,284" tone="primary" />
        <StatCard icon="payments" label="الإيراد اليومي" value="₪4,520" tone="secondary" />
        <StatCard icon="person_add" label="مستخدمون جدد" value="42" tone="tertiary" />
        <StatCard icon="store" label="متاجر نشطة" value="156" tone="warning-amber" />
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
            {WEEKLY.map((d, i) => (
              <div
                key={d.day}
                className={`flex-1 rounded-t-lg ${i === 2 ? 'bg-primary' : 'bg-surface-container'}`}
                style={{ height: `${d.value}%` }}
              />
            ))}
          </div>
          <div className="mt-4 flex justify-between text-[11px] text-muted-gray">
            {WEEKLY.map((d) => (
              <span key={d.day}>{d.day}</span>
            ))}
          </div>
        </div>

        {/* Monthly revenue */}
        <div className="rounded-xl border border-border-beige bg-surface-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-on-surface">الإيرادات الشهرية</h3>
            <span className="material-symbols-outlined text-secondary">bar_chart</span>
          </div>
          <div className="flex h-[200px] items-end justify-between gap-gap-md px-4">
            {MONTHLY.map((d, i) => (
              <div
                key={d.month}
                className={`w-full rounded-md transition-all hover:brightness-95 ${
                  i === 2 ? 'bg-secondary' : 'bg-secondary-container'
                }`}
                style={{ height: `${d.value}%` }}
              />
            ))}
          </div>
          <div className="mt-4 flex justify-between text-[11px] text-muted-gray">
            {MONTHLY.map((d) => (
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
              {ORDERS.map((o) => (
                <tr key={o.id} className="transition-colors hover:bg-surface-container-lowest">
                  <td className="px-6 py-4 text-[13px]">{o.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-gap-sm">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-outline-variant text-xs">
                        {o.customer.charAt(0)}
                      </div>
                      <span>{o.customer}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">{o.business}</td>
                  <td className="px-6 py-4 font-bold">{o.total}</td>
                  <td className="px-6 py-4">
                    <StatusBadge label={o.status} />
                  </td>
                  <td className="px-6 py-4 text-[11px] text-muted-gray">{o.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
