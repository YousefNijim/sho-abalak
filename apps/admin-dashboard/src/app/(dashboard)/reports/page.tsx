'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TableCard } from '@/components/data-table';
import { ordersApi } from '@shu/api-client';
import type { Order } from '@shu/api-client';

const PERIODS = ['اليوم', 'الأسبوع', 'الشهر'] as const;


export default function ReportsPage() {
  const [period, setPeriod] = useState(0);

  const { data: allOrders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.list(),
  });

  const now = new Date();
  const filtered = allOrders.filter((o: Order) => {
    const d = new Date(o.createdAt);
    if (period === 0) return d.toDateString() === now.toDateString();
    if (period === 1) return (now.getTime() - d.getTime()) < 7 * 86400_000;
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const delivered = filtered.filter((o: Order) => o.status === 'DELIVERED');
  const totalSales = delivered.reduce((s: number, o: Order) => s + o.total, 0);
  const commission = totalSales * 0.10;
  const deliveryFees = delivered.length * 3;
  const netRevenue = totalSales - commission;

  const CARDS = [
    { label: 'إجمالي المبيعات', value: `₪${totalSales.toFixed(0)}`, icon: 'payments', tone: 'text-primary bg-primary/10' },
    { label: 'عمولة المنصة (10%)', value: `₪${commission.toFixed(0)}`, icon: 'percent', tone: 'text-secondary bg-secondary/10' },
    { label: 'رسوم التوصيل', value: `₪${deliveryFees}`, icon: 'local_shipping', tone: 'text-tertiary bg-tertiary/10' },
    { label: 'صافي الإيراد', value: `₪${netRevenue.toFixed(0)}`, icon: 'account_balance', tone: 'text-warning-amber bg-warning-amber/10' },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-gap-md">
        <h2 className="text-2xl font-bold text-on-surface">التقارير المالية</h2>
        <div className="flex items-center gap-gap-md">
          <div className="flex gap-1 rounded-xl border border-border-beige bg-surface-white p-1">
            {PERIODS.map((p, i) => (
              <button
                key={p}
                onClick={() => setPeriod(i)}
                className={`rounded-lg px-4 py-2 text-[14px] font-bold transition-colors ${
                  period === i ? 'bg-primary text-white' : 'text-muted-gray hover:text-on-surface'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button className="flex h-12 items-center gap-gap-sm rounded-xl border border-border-beige bg-surface-white px-5 font-bold text-on-surface shadow-sm transition-all hover:bg-surface-container">
            <span className="material-symbols-outlined text-secondary">download</span>
            تصدير
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-margin-standard sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c) => (
          <div
            key={c.label}
            className="flex items-center gap-gap-md rounded-xl border border-border-beige bg-surface-white p-5 shadow-sm"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${c.tone}`}>
              <span className="material-symbols-outlined">{c.icon}</span>
            </div>
            <div>
              <p className="text-[13px] text-muted-gray">{c.label}</p>
              <h3 className="text-2xl font-bold text-on-surface">{c.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Transactions */}
      <TableCard
        headers={[
          { label: 'رقم الطلب' },
          { label: 'اسم المتجر' },
          { label: 'قيمة الطلب' },
          { label: 'العمولة' },
          { label: 'طريقة الدفع' },
          { label: 'التاريخ والوقت' },
          { label: 'الحالة' },
        ]}
      >
        {filtered.map((o: Order) => (
          <tr key={o.id} className="transition-colors hover:bg-background/30">
            <td className="px-6 py-4 text-[13px]">#{o.id.slice(0, 8)}</td>
            <td className="px-6 py-4">{o.business?.name ?? '—'}</td>
            <td className="px-6 py-4 font-bold">₪{o.total.toFixed(2)}</td>
            <td className="px-6 py-4 text-secondary">₪{(o.total * 0.1).toFixed(2)}</td>
            <td className="px-6 py-4">
              <span className="rounded-full bg-surface-container px-3 py-1 text-[12px]">
                {o.paymentMethod === 'CASH' ? 'نقدي' : 'إلكتروني'}
              </span>
            </td>
            <td className="px-6 py-4 text-[13px] text-muted-gray" dir="ltr">
              {new Date(o.createdAt).toLocaleString('ar-PS')}
            </td>
            <td className="px-6 py-4">
              <span
                className="rounded-full px-3 py-1 text-[12px] font-bold"
                style={
                  o.status === 'DELIVERED'
                    ? { backgroundColor: '#D1FAE5', color: '#065F46' }
                    : { backgroundColor: '#FEF3C7', color: '#92400E' }
                }
              >
                {o.status === 'DELIVERED' ? 'مُسوّى' : 'معلّق'}
              </span>
            </td>
          </tr>
        ))}
        {filtered.length === 0 && (
          <tr>
            <td colSpan={7} className="px-6 py-8 text-center text-muted-gray">لا توجد معاملات</td>
          </tr>
        )}
      </TableCard>
    </>
  );
}
