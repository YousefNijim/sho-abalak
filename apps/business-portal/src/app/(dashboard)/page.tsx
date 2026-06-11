'use client';

import { useQuery } from '@tanstack/react-query';
import { ordersApi, Order } from '@shu/api-client';
import { useBusiness } from '@/components/BusinessProvider';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { DriverSelectionModal } from '@/components/DriverSelectionModal';

export default function DashboardHome() {
  const { business, refetch: refetchBusiness } = useBusiness();
  const [driverModal, setDriverModal] = useState<{ isOpen: boolean; orderId: string; total: number; areaId: string }>({
    isOpen: false,
    orderId: '',
    total: 0,
    areaId: '',
  });

  // Polling active orders every 30 seconds
  const { data: allOrders = [], isLoading: isOrdersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['orders', 'all'],
    queryFn: () => ordersApi.list({ limit: 50 }),
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = allOrders.filter(o => new Date(o.createdAt) >= today);
  const deliveredTodayOrders = todayOrders.filter(o => o.status === 'DELIVERED');
  const todayRevenue = deliveredTodayOrders.reduce((sum, o) => sum + o.subtotal, 0);

  const activeOrders = allOrders.filter(o => 
    ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP'].includes(o.status)
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      await ordersApi.updateStatus(orderId, { status });
      refetchOrders();
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
      case 'PICKED_UP': return <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold">في الطريق</span>;
      default: return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-on-surface">مرحباً، {business?.name}</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface p-4 rounded-xl border border-border flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">shopping_bag</span>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-gray">طلبات اليوم</p>
            <p className="text-2xl font-bold text-on-surface">{todayOrders.length}</p>
          </div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-border flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success">
            <span className="material-symbols-outlined">trending_up</span>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-gray">إيرادات اليوم</p>
            <p className="text-2xl font-bold text-on-surface">{Number(todayRevenue).toFixed(2)} ش</p>
          </div>
        </div>

        <Link href="/orders" className="bg-surface p-4 rounded-xl border border-border flex items-center gap-4 shadow-sm hover:border-primary transition-colors cursor-pointer block w-full">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <span className="material-symbols-outlined">schedule</span>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-gray">قيد التنفيذ</p>
            <p className="text-2xl font-bold text-on-surface">{activeOrders.length}</p>
          </div>
        </Link>

        <div className="bg-surface p-4 rounded-xl border border-border flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center text-warning">
            <span className="material-symbols-outlined">star</span>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-gray">التقييم</p>
            <p className="text-2xl font-bold text-on-surface">
              {business?.rating ? `${Number(business.rating).toFixed(1)} ★` : 'لا يوجد تقييم'}
            </p>
          </div>
        </div>
      </div>

      {/* Active Orders */}
      <div className="bg-surface rounded-xl border border-border shadow-sm p-4 md:p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">local_fire_department</span>
            الطلبات النشطة
          </h2>
          <button onClick={() => refetchOrders()} className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">refresh</span>
            تحديث
          </button>
        </div>
        <p className="text-xs text-muted-gray mb-6 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">info</span>
          للحصول على الإشعارات حتى عند إغلاق المتصفح، استخدم تطبيق الهاتف المحمول
        </p>

        {isOrdersLoading ? (
          <div className="text-center py-12 text-muted-gray">جاري التحميل...</div>
        ) : activeOrders.length === 0 ? (
          <div className="text-center py-12 text-muted-gray flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-4xl opacity-50">inbox</span>
            لا توجد طلبات نشطة الآن 🎉
          </div>
        ) : (
          <div className="space-y-4">
            {activeOrders.map(order => (
              <div key={order.id} className="border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:bg-surface-container-low transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-on-surface">#{order.id.slice(-6).toUpperCase()}</span>
                    {getStatusBadge(order.status)}
                  </div>
                  <p className="text-sm font-medium text-on-surface">{order.customer?.name} - {order.customer?.phone}</p>
                  <p className="text-xs text-muted-gray mt-1">
                    {order.items?.length} منتجات | {order.paymentMethod === 'CASH' ? 'كاش' : 'إلكتروني'}
                  </p>
                </div>
                
                <div className="flex flex-col items-end gap-3 min-w-[150px]">
                  <span className="font-bold text-lg text-primary">{Number(order.total).toFixed(2)} ش</span>
                  <div className="flex gap-2 w-full justify-end">
                    {order.status === 'PENDING' && (
                      <>
                        <button onClick={() => handleUpdateStatus(order.id, 'CONFIRMED')} className="px-3 py-1.5 bg-success text-white rounded font-bold text-xs hover:bg-green-600 transition-colors w-full">قبول</button>
                        <button onClick={() => handleUpdateStatus(order.id, 'CANCELLED')} className="px-3 py-1.5 bg-error text-white rounded font-bold text-xs hover:bg-red-600 transition-colors w-full">رفض</button>
                      </>
                    )}
                    {order.status === 'CONFIRMED' && (
                      <button onClick={() => handleUpdateStatus(order.id, 'PREPARING')} className="px-3 py-1.5 bg-primary text-white rounded font-bold text-xs hover:bg-primary-dark transition-colors w-full">بدأ التحضير</button>
                    )}
                    {order.status === 'PREPARING' && (
                      <button onClick={() => handleUpdateStatus(order.id, 'READY')} className="px-3 py-1.5 bg-success text-white rounded font-bold text-xs hover:bg-green-600 transition-colors w-full">جاهز للتوصيل</button>
                    )}
                    {order.status === 'READY' && (
                      <button 
                        onClick={() => setDriverModal({
                          isOpen: true,
                          orderId: order.id,
                          total: Number(order.total),
                          areaId: order.deliveryAreaId || business?.areaId || ''
                        })} 
                        className="px-3 py-1.5 bg-primary text-white rounded font-bold text-xs hover:bg-primary-dark transition-colors w-full flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">directions_car</span>
                        تعيين سائق
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DriverSelectionModal
        isOpen={driverModal.isOpen}
        orderIds={[driverModal.orderId]}
        orderTotal={driverModal.total}
        deliveryAreaId={driverModal.areaId}
        onClose={() => setDriverModal({ ...driverModal, isOpen: false })}
        onDriverAssigned={() => {
          setDriverModal({ ...driverModal, isOpen: false });
          refetchOrders();
        }}
      />
    </div>
  );
}
