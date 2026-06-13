'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@shu/api-client';
import { DriverSelectionModal } from '@/components/DriverSelectionModal';
import { OrderDetailsPanel } from '@/components/OrderDetailsPanel';
import { useBusiness } from '@/components/BusinessProvider';

type TabStatus = 'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
type DateFilter = 'TODAY' | 'WEEK' | 'MONTH' | 'ALL';

export default function OrdersPage() {
  const { business } = useBusiness();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabStatus>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [driverModal, setDriverModal] = useState<{ isOpen: boolean; orderId: string; total: number; areaId: string }>({
    isOpen: false,
    orderId: '',
    total: 0,
    areaId: '',
  });
  const [escalateModal, setEscalateModal] = useState<{ isOpen: boolean; orderId: string } | null>(null);
  const [escalateReason, setEscalateReason] = useState('');

  const { data: allOrders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.list({ limit: 500 }),
  });

  const escalateMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      ordersApi.escalateOrder(id, { reason: reason || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      setEscalateModal(null);
      setEscalateReason('');
    },
  });

  const selfDeliverMutation = useMutation({
    mutationFn: (id: string) => ordersApi.selfDeliver(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });

  const filteredOrders = allOrders.filter(order => {
    // Status filter
    if (tab === 'ACTIVE' && !['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(order.status)) return false;
    if (tab === 'COMPLETED' && !['DELIVERED'].includes(order.status)) return false;
    if (tab === 'CANCELLED' && !['CANCELLED', 'REJECTED'].includes(order.status)) return false;

    // Date filter
    const orderDate = new Date(order.createdAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateFilter === 'TODAY' && orderDate < today) return false;
    
    if (dateFilter === 'WEEK') {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (orderDate < weekAgo) return false;
    }
    
    if (dateFilter === 'MONTH') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      if (orderDate < monthAgo) return false;
    }

    return true;
  });

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      await ordersApi.updateStatus(orderId, { status });
      qc.invalidateQueries({ queryKey: ['orders'] });
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <span className="bg-warning/20 text-warning px-2 py-1 rounded text-xs font-bold">جديد</span>;
      case 'CONFIRMED': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">مؤكد</span>;
      case 'PREPARING': return <span className="bg-primary/20 text-primary-dark px-2 py-1 rounded text-xs font-bold">قيد التحضير</span>;
      case 'READY': return <span className="bg-success/20 text-success px-2 py-1 rounded text-xs font-bold">جاهز</span>;
      case 'ESCALATED': return <span className="bg-[#FFF3CD] text-[#92400E] border border-[#F59E0B] px-2 py-1 rounded text-xs font-bold">مصعّد للإدارة</span>;
      case 'DELIVERED': return <span className="bg-success/10 text-success px-2 py-1 rounded text-xs font-bold">مكتمل</span>;
      case 'CANCELLED': 
      case 'REJECTED': return <span className="bg-error/10 text-error px-2 py-1 rounded text-xs font-bold">ملغى</span>;
      default: return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-on-surface">إدارة الطلبات</h1>
        
        <div className="flex bg-surface border border-border rounded-lg overflow-hidden flex-wrap">
          {(['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as TabStatus[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-bold transition-colors ${
                tab === t ? 'bg-primary text-white' : 'text-muted-gray hover:bg-surface-container-low'
              }`}
            >
              {t === 'ALL' ? 'الكل' : t === 'ACTIVE' ? 'نشطة' : t === 'COMPLETED' ? 'مكتملة' : 'ملغاة'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-muted-gray">الفترة:</span>
        <select 
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none"
        >
          <option value="ALL">الكل</option>
          <option value="TODAY">اليوم</option>
          <option value="WEEK">هذا الأسبوع</option>
          <option value="MONTH">هذا الشهر</option>
        </select>
      </div>

      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm whitespace-nowrap min-w-[800px]">
            <thead className="bg-surface-container-low border-b border-border text-muted-gray">
              <tr>
                <th className="px-4 py-3 font-bold">رقم الطلب</th>
                <th className="px-4 py-3 font-bold">الزبون</th>
                <th className="px-4 py-3 font-bold">المنتجات</th>
                <th className="px-4 py-3 font-bold">المبلغ</th>
                <th className="px-4 py-3 font-bold">طريقة الدفع</th>
                <th className="px-4 py-3 font-bold">الحالة</th>
                <th className="px-4 py-3 font-bold">التاريخ</th>
                <th className="px-4 py-3 font-bold">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-gray">جاري التحميل...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-gray">لا توجد طلبات تطابق الفلتر</td></tr>
              ) : (
                filteredOrders.map(order => (
                  <React.Fragment key={order.id}>
                    <tr 
                      className={`hover:bg-surface-container-low transition-colors cursor-pointer`}
                      onClick={() => setSelectedOrderId(order.id)}
                    >
                      <td className="px-4 py-3 font-bold text-primary">#{order.id.slice(-6).toUpperCase()}</td>
                      <td className="px-4 py-3 font-medium">{order.customer?.name}</td>
                      <td className="px-4 py-3 text-muted-gray">{order.items?.length || 0} عناصر</td>
                      <td className="px-4 py-3 font-bold text-on-surface">{Number(order.total).toFixed(2)} ش</td>
                      <td className="px-4 py-3 text-muted-gray">{order.paymentMethod === 'CASH' ? 'كاش' : 'إلكتروني'}</td>
                      <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                      <td className="px-4 py-3 text-muted-gray" dir="ltr">{new Date(order.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2 flex-wrap">
                          {order.status === 'PENDING' && business?.type === 'STORE' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setEscalateModal({ isOpen: true, orderId: order.id }); setEscalateReason(''); }}
                              className="px-2 py-1 bg-[#F59E0B] text-white rounded font-bold text-xs hover:bg-amber-600 transition-colors"
                            >⚠️ تصعيد</button>
                          )}
                          {order.status === 'PENDING' && (
                            <>
                              <button onClick={() => handleUpdateStatus(order.id, 'CONFIRMED')} className="px-2 py-1 bg-success text-white rounded font-bold text-xs hover:bg-green-600 transition-colors">قبول</button>
                              <button onClick={() => handleUpdateStatus(order.id, 'CANCELLED')} className="px-2 py-1 bg-error text-white rounded font-bold text-xs hover:bg-red-600 transition-colors">رفض</button>
                            </>
                          )}
                          {order.status === 'ESCALATED' && (
                            <span className="text-[#92400E] text-xs font-bold">⏳ بانتظار الإدارة</span>
                          )}
                          {order.status === 'CONFIRMED' && (
                            <button onClick={() => handleUpdateStatus(order.id, 'PREPARING')} className="px-2 py-1 bg-primary text-white rounded font-bold text-xs hover:bg-primary-dark transition-colors">بدأ التحضير</button>
                          )}
                          {order.status === 'PREPARING' && (
                            <button onClick={() => handleUpdateStatus(order.id, 'READY')} className="px-2 py-1 bg-success text-white rounded font-bold text-xs hover:bg-green-600 transition-colors">جاهز للتوصيل</button>
                          )}
                          {order.status === 'READY' && (
                            <>
                              {business?.type === 'STORE' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); selfDeliverMutation.mutate(order.id); }}
                                  disabled={selfDeliverMutation.isPending}
                                  className="px-2 py-1 bg-emerald-600 text-white rounded font-bold text-xs hover:bg-emerald-700 transition-colors"
                                >🏪 توصيل من المتجر</button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDriverModal({
                                    isOpen: true,
                                    orderId: order.id,
                                    total: Number(order.total),
                                    areaId: order.customer?.area?.id || business?.areaId || ''
                                  });
                                }}
                                className="px-2 py-1 bg-primary text-white rounded font-bold text-xs hover:bg-primary-dark transition-colors flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[12px]">directions_car</span>
                                تعيين سائق
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DriverSelectionModal
        isOpen={driverModal.isOpen}
        orderIds={[driverModal.orderId]}
        orderTotal={driverModal.total}
        deliveryAreaId={driverModal.areaId}
        onClose={() => setDriverModal({ ...driverModal, isOpen: false })}
        onDriverAssigned={() => {
          setDriverModal({ ...driverModal, isOpen: false });
          qc.invalidateQueries({ queryKey: ['orders'] });
        }}
      />

      {/* Escalation reason modal */}
      {escalateModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEscalateModal(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" dir="rtl">
            <h3 className="text-[16px] font-bold text-on-surface mb-4">⚠️ تصعيد الطلب للإدارة</h3>
            <p className="text-[13px] text-muted-gray mb-3">سيتم إرسال الطلب للإدارة لتحديد رسوم التوصيل المناسبة (مركبة أكبر).</p>
            <label className="block text-[12px] font-bold text-on-surface mb-1.5">سبب التصعيد (اختياري)</label>
            <textarea
              value={escalateReason}
              onChange={(e) => setEscalateReason(e.target.value)}
              placeholder="مثال: الطلب كبير الحجم، يحتاج شاحنة..."
              rows={3}
              className="w-full rounded-lg border border-border-beige px-3 py-2 text-[13px] text-on-surface placeholder:text-muted-gray focus:border-primary focus:outline-none resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setEscalateModal(null)} className="flex-1 h-11 rounded-xl border border-border-beige font-bold text-[13px] text-on-surface hover:bg-surface-container-low transition-colors">إلغاء</button>
              <button
                onClick={() => escalateMutation.mutate({ id: escalateModal.orderId, reason: escalateReason })}
                disabled={escalateMutation.isPending}
                className="flex-1 h-11 rounded-xl bg-[#F59E0B] text-white font-bold text-[13px] hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {escalateMutation.isPending ? 'جاري...' : 'تأكيد التصعيد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide Panel for Order Details */}
      <OrderDetailsPanel
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </div>
  );
}
