'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { driversApi, ordersApi } from '@shu/api-client';

interface DriverSelectionModalProps {
  orderIds: string[];
  orderTotal?: number;
  deliveryAreaId?: string;
  isOpen: boolean;
  onClose: () => void;
  onDriverAssigned: () => void;
}

export function DriverSelectionModal({
  orderIds,
  orderTotal,
  deliveryAreaId,
  isOpen,
  onClose,
  onDriverAssigned,
}: DriverSelectionModalProps) {
  const [pendingDriverId, setPendingDriverId] = useState<string | null>(null);

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['available-drivers', deliveryAreaId],
    queryFn: () => driversApi.available(deliveryAreaId),
    enabled: isOpen,
  });

  const sendRequest = useMutation({
    mutationFn: (driverId: string) => ordersApi.sendDriverRequest(orderIds, driverId),
    onSuccess: (_, driverId) => {
      setPendingDriverId(driverId);
      // Wait a moment then close and refresh, or let the user close it
      // Actually, mobile app stays in 'pending' state until the driver accepts.
      // But in the portal we can just close it and let the dashboard show "Waiting for driver"
      setTimeout(() => {
        onDriverAssigned();
        setPendingDriverId(null);
      }, 2000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'فشل إرسال الطلب للسائق.';
      alert(Array.isArray(msg) ? msg.join('\n') : msg);
    },
  });

  if (!isOpen) return null;

  const isBatch = orderIds.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-border flex justify-between items-center bg-surface-container-low">
          <div>
            <h2 className="text-xl font-bold text-on-surface">اختيار سائق للتوصيل</h2>
            <p className="text-sm text-muted-gray mt-1">
              {isBatch 
                ? `إرسال ${orderIds.length} طلبات مجمعة` 
                : `طلب #${orderIds[0]?.slice(-6).toUpperCase()} — قيمة: ${orderTotal || 0} ش`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-muted-gray hover:bg-border rounded-full transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
            </div>
          ) : pendingDriverId ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="material-symbols-outlined animate-spin text-4xl text-primary mb-4">progress_activity</span>
              <h3 className="text-xl font-bold text-on-surface">تم إرسال {isBatch ? 'الطلبات' : 'الطلب'} للسائق</h3>
              <p className="text-muted-gray mt-2">بانتظار القبول...</p>
            </div>
          ) : drivers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-gray">
              <span className="material-symbols-outlined text-5xl mb-4 opacity-50">directions_car</span>
              <p className="text-lg font-medium">لا يوجد سائقون متاحون في هذه المنطقة حالياً</p>
              <p className="text-sm mt-1">يمكنك المحاولة مجدداً بعد قليل</p>
            </div>
          ) : (
            <div className="space-y-3">
              {drivers.map((driver: any) => (
                <div key={driver.id} className="border border-border rounded-xl p-4 flex items-center gap-4 hover:border-primary transition-colors bg-surface">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-xl">
                    🛵
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-on-surface">{driver.user?.name || 'سائق منصة شو عبالك'}</h3>
                    <p className="text-sm text-muted-gray mt-0.5">
                      {driver.area?.city} - {driver.area?.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-warning flex items-center">
                        <span className="material-symbols-outlined text-[14px]">star</span>
                        {driver.rating ? driver.rating.toFixed(1) : '5.0'}
                      </span>
                      <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded font-bold">متاح</span>
                    </div>
                  </div>
                  <button
                    onClick={() => sendRequest.mutate(driver.id)}
                    disabled={sendRequest.isPending}
                    className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
                  >
                    {sendRequest.isPending && sendRequest.variables === driver.id ? 'جاري الإرسال...' : 'إرسال الطلب'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
