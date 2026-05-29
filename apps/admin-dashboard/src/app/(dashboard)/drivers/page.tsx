'use client';

import { useQuery } from '@tanstack/react-query';
import { TableCard, StatusDot, RowActions } from '@/components/data-table';
import { driversApi } from '@shu/api-client';
import type { Driver } from '@shu/api-client';

export default function DriversPage() {
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => driversApi.list(),
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-on-surface">إدارة السائقين</h2>
        <button className="flex h-12 items-center gap-gap-sm rounded-xl bg-primary px-6 text-white shadow-md transition-all hover:brightness-95 active:scale-95">
          <span className="material-symbols-outlined">add</span>
          <span className="font-bold">إضافة سائق</span>
        </button>
      </div>

      <TableCard
        headers={[
          { label: 'اسم السائق' },
          { label: 'رقم الهاتف' },
          { label: 'المنطقة' },
          { label: 'التقييم', align: 'center' },
          { label: 'الحالة' },
          { label: 'إجراءات', align: 'left' },
        ]}
      >
        {drivers.map((d: Driver) => (
          <tr key={d.id} className="group transition-colors hover:bg-background/30">
            <td className="px-6 py-4">
              <div className="flex items-center gap-gap-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/15 text-xs text-secondary">
                  {d.user?.name?.charAt(0) ?? '?'}
                </div>
                <span>{d.user?.name ?? '—'}</span>
              </div>
            </td>
            <td className="px-6 py-4" dir="ltr">{d.user?.phone ?? '—'}</td>
            <td className="px-6 py-4">{d.area?.city ?? '—'} - {d.area?.name ?? ''}</td>
            <td className="px-6 py-4">
              <div className="flex items-center justify-center gap-1 text-warning-amber">
                <span className="material-symbols-outlined text-[18px]">star</span>
                <span className="text-[14px] font-bold">{d.rating.toFixed(1)}</span>
              </div>
            </td>
            <td className="px-6 py-4">
              <StatusDot
                active={d.status === 'AVAILABLE'}
                on="متاح"
                off={d.status === 'BUSY' ? 'مشغول' : 'غير متاح'}
              />
            </td>
            <td className="px-6 py-4">
              <RowActions />
            </td>
          </tr>
        ))}
        {drivers.length === 0 && (
          <tr>
            <td colSpan={6} className="px-6 py-8 text-center text-muted-gray">لا يوجد سائقون</td>
          </tr>
        )}
      </TableCard>
    </>
  );
}

