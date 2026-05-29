'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@shu/api-client';
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

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-[#FEF9C3] text-[#854D0E]',
  CONFIRMED: 'bg-[#DBEAFE] text-[#1E40AF]',
  PREPARING: 'bg-[#FFEDD5] text-[#C2410C]',
  READY: 'bg-[#EDE9FE] text-[#6D28D9]',
  PICKED_UP: 'bg-[#CFFAFE] text-[#0E7490]',
  DELIVERED: 'bg-[#DCFCE7] text-[#166534]',
  CANCELLED: 'bg-[#FEE2E2] text-[#991B1B]',
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  return `منذ ${Math.floor(diff / 86400)} يوم`;
}

export default function OrdersPage() {
  const qc = useQueryClient();
  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.list(),
    refetchInterval: 30_000,
  });

  const cancel = useMutation({
    mutationFn: (id: string) =>
      ordersApi.updateStatus(id, { status: 'CANCELLED' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-on-surface">إدارة الطلبات</h2>
        <span className="text-[14px] text-muted-gray">{orders.length} طلب</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border-beige bg-surface-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-right">
            <thead>
              <tr className="border-b border-border-beige bg-surface-container-low text-[14px] text-on-surface">
                <th className="px-6 py-4 font-semibold">رقم الطلب</th>
                <th className="px-6 py-4 font-semibold">الزبون</th>
                <th className="px-6 py-4 font-semibold">المنشأة</th>
                <th className="px-6 py-4 font-semibold">المجموع</th>
                <th className="px-6 py-4 font-semibold">طريقة الدفع</th>
                <th className="px-6 py-4 font-semibold">الحالة</th>
                <th className="px-6 py-4 font-semibold">الوقت</th>
                <th className="px-6 py-4 text-left font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-beige">
              {orders.map((o: Order) => (
                <tr key={o.id} className="group transition-colors hover:bg-background/30">
                  <td className="px-6 py-4 text-[13px] font-mono">#{o.id.slice(0, 8)}</td>
                  <td className="px-6 py-4">{o.customer?.name ?? '—'}</td>
                  <td className="px-6 py-4">{o.business?.name ?? '—'}</td>
                  <td className="px-6 py-4 font-bold">₪{o.total.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-surface-container px-3 py-1 text-[12px]">
                      {o.paymentMethod === 'CASH' ? 'نقدي' : 'إلكتروني'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-[12px] font-bold ${STATUS_COLOR[o.status] ?? ''}`}>
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[11px] text-muted-gray">{timeAgo(o.createdAt)}</td>
                  <td className="px-6 py-4">
                    {o.status === 'PENDING' && (
                      <button
                        onClick={() => cancel.mutate(o.id)}
                        className="text-[12px] font-bold text-error hover:underline"
                      >
                        إلغاء
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-gray">
                    لا توجد طلبات
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
