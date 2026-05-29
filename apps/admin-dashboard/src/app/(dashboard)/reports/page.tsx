'use client';

import { useState } from 'react';
import { TableCard } from '@/components/data-table';

const PERIODS = ['اليوم', 'الأسبوع', 'الشهر'] as const;

const CARDS = [
  { label: 'إجمالي المبيعات', value: '₪14,250', icon: 'payments', tone: 'text-primary bg-primary/10' },
  { label: 'عمولة المنصة', value: '₪1,710', icon: 'percent', tone: 'text-secondary bg-secondary/10' },
  { label: 'رسوم التوصيل', value: '₪2,450', icon: 'local_shipping', tone: 'text-tertiary bg-tertiary/10' },
  { label: 'صافي الإيراد', value: '₪10,090', icon: 'account_balance', tone: 'text-warning-amber bg-warning-amber/10' },
];

const TXNS = [
  { id: '#ORD-9421', store: 'مطعم الشام', amount: '₪85.00', commission: '₪10.20', method: 'نقدي', date: '2026-05-29 14:05', settled: true },
  { id: '#ORD-9420', store: 'برجر هاوس', amount: '₪120.50', commission: '₪14.46', method: 'إلكتروني', date: '2026-05-29 13:52', settled: true },
  { id: '#ORD-9419', store: 'حلويات القدس', amount: '₪45.00', commission: '₪5.40', method: 'نقدي', date: '2026-05-29 13:40', settled: false },
];

export default function ReportsPage() {
  const [period, setPeriod] = useState(0);

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
        {TXNS.map((t) => (
          <tr key={t.id} className="transition-colors hover:bg-background/30">
            <td className="px-6 py-4 text-[13px]">{t.id}</td>
            <td className="px-6 py-4">{t.store}</td>
            <td className="px-6 py-4 font-bold">{t.amount}</td>
            <td className="px-6 py-4 text-secondary">{t.commission}</td>
            <td className="px-6 py-4">
              <span className="rounded-full bg-surface-container px-3 py-1 text-[12px]">{t.method}</span>
            </td>
            <td className="px-6 py-4 text-[13px] text-muted-gray" dir="ltr">{t.date}</td>
            <td className="px-6 py-4">
              <span
                className="rounded-full px-3 py-1 text-[12px] font-bold"
                style={
                  t.settled
                    ? { backgroundColor: '#D1FAE5', color: '#065F46' }
                    : { backgroundColor: '#FEF3C7', color: '#92400E' }
                }
              >
                {t.settled ? 'مُسوّى' : 'معلّق'}
              </span>
            </td>
          </tr>
        ))}
      </TableCard>
    </>
  );
}
