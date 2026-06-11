'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@shu/api-client';
import { DriverSelectionModal } from './DriverSelectionModal';

interface OrderDetailsPanelProps {
  orderId: string | null;
  onClose: () => void;
}

const STATUS_ARABIC: Record<string, string> = {
  PENDING: 'قيد الانتظار',
  CONFIRMED: 'تم القبول',
  PREPARING: 'جاري التحضير',
  READY: 'جاهز للتوصيل',
  PICKED_UP: 'في الطريق',
  DELIVERED: 'تم التوصيل',
  CANCELLED: 'ملغى',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-warning/20 text-warning',
  CONFIRMED: 'bg-info/20 text-info',
  PREPARING: 'bg-primary/20 text-primary',
  READY: 'bg-success/20 text-success',
  PICKED_UP: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-gray-200 text-gray-700',
  CANCELLED: 'bg-error/20 text-error',
};

export function OrderDetailsPanel({ orderId, onClose }: OrderDetailsPanelProps) {
  const queryClient = useQueryClient();
  const [isDriverModalOpen, setIsDriverModalOpen] = React.useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getById(orderId!),
    enabled: !!orderId,
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => ordersApi.updateStatus(orderId!, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'فشل تحديث الحالة';
      alert(Array.isArray(msg) ? msg.join('\n') : msg);
    },
  });

  if (!orderId) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm" onClick={onClose} />
      
      <div className={`fixed top-0 left-0 h-full w-full md:w-[450px] bg-surface z-50 shadow-2xl flex flex-col transform transition-transform duration-300 translate-x-0`}>
        <div className="p-4 border-b border-border flex justify-between items-center bg-surface-container-low">
          <div>
            <h2 className="text-xl font-bold text-on-surface">طلب #{order?.id.slice(-6).toUpperCase()}</h2>
            <p className="text-sm text-muted-gray mt-1">
              {order?.createdAt ? new Date(order.createdAt).toLocaleString('ar-EG') : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-border rounded-full text-muted-gray transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
            </div>
          ) : !order ? (
            <div className="text-center text-muted-gray mt-10">لم يتم العثور على الطلب</div>
          ) : (
            <>
              {/* Header Info */}
              <div className="flex justify-between items-center bg-surface-container p-4 rounded-xl border border-border">
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                  {STATUS_ARABIC[order.status] || order.status}
                </span>
                <span className="font-extrabold text-xl text-primary">{Number(order.total).toFixed(2)} ₪</span>
              </div>

              {/* Customer Info */}
              <div>
                <h3 className="font-bold text-on-surface flex items-center gap-2 border-b border-border pb-2 mb-3">
                  <span className="material-symbols-outlined text-[18px] text-muted-gray">person</span>
                  معلومات الزبون
                </h3>
                <div className="bg-surface-container-low p-4 rounded-xl space-y-3 text-sm border border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-gray">الاسم:</span>
                    <span className="font-bold text-on-surface">{order.customer?.name || 'غير معروف'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-gray">الهاتف:</span>
                    <a href={`tel:${order.customer?.phone}`} className="font-bold text-primary dir-ltr">
                      {order.customer?.phone}
                    </a>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-muted-gray">العنوان:</span>
                    <span className="font-bold text-on-surface text-left">
                      {order.deliveryAreaName}<br/>
                      <span className="text-xs text-muted-gray">{order.deliveryAddressDetail}</span>
                    </span>
                  </div>
                  {order.note && (
                    <div className="mt-2 p-2 bg-warning/10 text-warning rounded-lg border border-warning/20">
                      <strong>ملاحظة: </strong>{order.note}
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="font-bold text-on-surface flex items-center gap-2 border-b border-border pb-2 mb-3">
                  <span className="material-symbols-outlined text-[18px] text-muted-gray">shopping_bag</span>
                  المنتجات
                </h3>
                <div className="bg-surface-container-low rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-border/50 text-muted-gray">
                      <tr>
                        <th className="py-2 px-3">المنتج</th>
                        <th className="py-2 px-3 text-center">الكمية</th>
                        <th className="py-2 px-3 text-left">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {order.items?.map((item: any, i: number) => (
                        <tr key={i}>
                          <td className="py-2 px-3 text-on-surface font-medium">
                            {item.product?.name || `Product ${item.productId}`}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-primary">{item.quantity}</td>
                          <td className="py-2 px-3 text-left text-on-surface font-bold">
                            {(Number(item.unitPrice) * Number(item.quantity)).toFixed(2)} ₪
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-3 bg-surface-container border-t border-border space-y-1 text-sm">
                    <div className="flex justify-between text-muted-gray">
                      <span>المجموع:</span>
                      <span>{Number(order.subtotal).toFixed(2)} ₪</span>
                    </div>
                    {Number(order.couponDiscount) > 0 && (
                      <div className="flex justify-between text-success">
                        <span>الخصم ({order.couponCode}):</span>
                        <span>-{Number(order.couponDiscount).toFixed(2)} ₪</span>
                      </div>
                    )}
                    <div className="flex justify-between text-muted-gray">
                      <span>رسوم التوصيل:</span>
                      <span>{Number(order.deliveryFee).toFixed(2)} ₪</span>
                    </div>
                    <div className="flex justify-between font-extrabold text-base pt-2 border-t border-border mt-1 text-on-surface">
                      <span>الإجمالي:</span>
                      <span>{Number(order.total).toFixed(2)} ₪</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-gray pt-1">
                      <span>طريقة الدفع:</span>
                      <span className="font-bold">{order.paymentMethod === 'CASH' ? 'نقدي عند الاستلام' : 'إلكتروني'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Driver Info */}
              {order.driverId && order.driver && (
                <div>
                  <h3 className="font-bold text-on-surface flex items-center gap-2 border-b border-border pb-2 mb-3">
                    <span className="material-symbols-outlined text-[18px] text-muted-gray">directions_car</span>
                    معلومات السائق
                  </h3>
                  <div className="bg-surface-container-low p-4 rounded-xl border border-border flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 text-primary flex items-center justify-center rounded-full text-2xl">
                      🛵
                    </div>
                    <div>
                      <p className="font-bold text-on-surface">{order.driver.user?.name || 'سائق غير معروف'}</p>
                      <a href={`tel:${order.driver.user?.phone}`} className="text-sm font-bold text-primary dir-ltr inline-block mt-0.5">
                        {order.driver.user?.phone}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div>
                <h3 className="font-bold text-on-surface flex items-center gap-2 border-b border-border pb-2 mb-3">
                  <span className="material-symbols-outlined text-[18px] text-muted-gray">history</span>
                  الخط الزمني
                </h3>
                <div className="bg-surface-container-low p-4 rounded-xl border border-border">
                  {order.statusHistory?.map((h: any, i: number) => (
                    <div key={i} className="flex gap-4 relative pb-4 last:pb-0">
                      {i !== (order.statusHistory?.length || 0) - 1 && (
                        <div className="absolute top-6 bottom-0 right-3 w-0.5 bg-border"></div>
                      )}
                      <div className="relative z-10 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center border-2 border-surface mt-1">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                      </div>
                      <div>
                        <p className="font-bold text-sm text-on-surface">{STATUS_ARABIC[h.status] || h.status}</p>
                        <p className="text-xs text-muted-gray mt-0.5">
                          {new Date(h.createdAt).toLocaleString('ar-EG')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-border grid grid-cols-2 gap-3 sticky bottom-0 bg-surface pb-2">
                {order.status === 'PENDING' && (
                  <>
                    <button disabled={updateStatus.isPending} onClick={() => updateStatus.mutate('CONFIRMED')} className="py-3 bg-success text-white rounded-lg font-bold hover:bg-green-600 transition-colors">قبول الطلب</button>
                    <button disabled={updateStatus.isPending} onClick={() => { if(confirm('هل أنت متأكد من رفض وإلغاء الطلب؟')) updateStatus.mutate('CANCELLED') }} className="py-3 bg-error text-white rounded-lg font-bold hover:bg-red-600 transition-colors">إلغاء ورفض</button>
                  </>
                )}
                {order.status === 'CONFIRMED' && (
                  <button disabled={updateStatus.isPending} onClick={() => updateStatus.mutate('PREPARING')} className="py-3 col-span-2 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark transition-colors">بدأ التحضير</button>
                )}
                {order.status === 'PREPARING' && (
                  <button disabled={updateStatus.isPending} onClick={() => updateStatus.mutate('READY')} className="py-3 col-span-2 bg-success text-white rounded-lg font-bold hover:bg-green-600 transition-colors">جاهز للتوصيل</button>
                )}
                {order.status === 'READY' && (
                  <button onClick={() => setIsDriverModalOpen(true)} className="py-3 col-span-2 bg-primary text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors">
                    <span className="material-symbols-outlined text-[18px]">directions_car</span>
                    تعيين سائق
                  </button>
                )}
                {['PICKED_UP', 'DELIVERED', 'CANCELLED'].includes(order.status) && (
                  <div className="col-span-2 text-center text-muted-gray py-2 bg-surface-container rounded-lg border border-border">
                    لا يوجد إجراءات متاحة في هذه الحالة
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <DriverSelectionModal
        isOpen={isDriverModalOpen}
        orderIds={order ? [order.id] : []}
        orderTotal={Number(order?.total)}
        deliveryAreaId={order?.deliveryAreaId || ''}
        onClose={() => setIsDriverModalOpen(false)}
        onDriverAssigned={() => {
          setIsDriverModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['order', order?.id] });
          queryClient.invalidateQueries({ queryKey: ['orders'] });
        }}
      />
    </>
  );
}
