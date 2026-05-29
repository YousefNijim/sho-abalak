'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TableCard, StatusDot, RowActions } from '@/components/data-table';
import { usersApi } from '@shu/api-client';
import type { AdminUser } from '@shu/api-client';

const TABS = ['الزبائن', 'السائقون', 'أصحاب المنشآت'] as const;
const TAB_ROLES = ['CUSTOMER', 'DRIVER', 'BUSINESS'] as const;


export default function UsersPage() {
  const [tab, setTab] = useState(0);
  const qc = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users', TAB_ROLES[tab]],
    queryFn: () => usersApi.list({ role: TAB_ROLES[tab] }),
  });

  const suspend = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'SUSPENDED' | 'BANNED' }) =>
      usersApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

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
          { label: 'الحالة' },
          { label: 'الإجراءات', align: 'left' },
        ]}
      >
        {users.map((u: AdminUser) => (
          <tr key={u.id} className="group transition-colors hover:bg-background/30">
            <td className="px-6 py-4">
              <div className="flex items-center gap-gap-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-outline-variant text-xs">
                  {u.name.charAt(0)}
                </div>
                <span>{u.name}</span>
              </div>
            </td>
            <td className="px-6 py-4" dir="ltr">{u.phone}</td>
            <td className="px-6 py-4">{u.area?.city ?? '—'}</td>
            <td className="px-6 py-4 text-muted-gray" dir="ltr">{u.createdAt.slice(0, 10)}</td>
            <td className="px-6 py-4">
              <StatusDot active={u.status === 'ACTIVE'} />
            </td>
            <td className="px-6 py-4">
              <RowActions
                onSuspend={
                  u.status === 'ACTIVE'
                    ? () => suspend.mutate({ id: u.id, status: 'SUSPENDED' })
                    : () => suspend.mutate({ id: u.id, status: 'ACTIVE' })
                }
              />
            </td>
          </tr>
        ))}
        {users.length === 0 && (
          <tr>
            <td colSpan={6} className="px-6 py-8 text-center text-muted-gray">لا يوجد مستخدمون</td>
          </tr>
        )}
      </TableCard>
    </>
  );
}
