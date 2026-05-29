'use client';

import { useState } from 'react';
import { TableCard, StatusDot, RowActions } from '@/components/data-table';

const TABS = ['الزبائن', 'السائقون', 'أصحاب المنشآت'] as const;

const USERS = [
  { name: 'سامي علي', phone: '0599-123-456', area: 'رام الله', joined: '2026-01-12', lastOrder: 'منذ 5 دقائق', active: true },
  { name: 'نور حسين', phone: '0598-222-789', area: 'نابلس', joined: '2025-11-03', lastOrder: 'منذ يومين', active: true },
  { name: 'مريم يوسف', phone: '0567-908-114', area: 'الخليل', joined: '2025-09-21', lastOrder: 'منذ شهر', active: false },
];

export default function UsersPage() {
  const [tab, setTab] = useState(0);

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-on-surface">إدارة المستخدمين</h2>
      </div>

      {/* Tabs */}
      <div className="flex w-fit gap-1 rounded-xl border border-border-beige bg-surface-white p-1">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`rounded-lg px-5 py-2 text-[14px] font-bold transition-colors ${
              tab === i ? 'bg-primary text-white' : 'text-muted-gray hover:text-on-surface'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <TableCard
        headers={[
          { label: 'اسم المستخدم' },
          { label: 'رقم الهاتف' },
          { label: 'المنطقة' },
          { label: 'تاريخ التسجيل' },
          { label: 'آخر طلب' },
          { label: 'الحالة' },
          { label: 'الإجراءات', align: 'left' },
        ]}
      >
        {USERS.map((u) => (
          <tr key={u.phone} className="group transition-colors hover:bg-background/30">
            <td className="px-6 py-4">
              <div className="flex items-center gap-gap-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-outline-variant text-xs">
                  {u.name.charAt(0)}
                </div>
                <span>{u.name}</span>
              </div>
            </td>
            <td className="px-6 py-4" dir="ltr">{u.phone}</td>
            <td className="px-6 py-4">{u.area}</td>
            <td className="px-6 py-4 text-muted-gray" dir="ltr">{u.joined}</td>
            <td className="px-6 py-4 text-[13px] text-muted-gray">{u.lastOrder}</td>
            <td className="px-6 py-4">
              <StatusDot active={u.active} />
            </td>
            <td className="px-6 py-4">
              <RowActions />
            </td>
          </tr>
        ))}
      </TableCard>
    </>
  );
}
