'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driversApi, ordersApi, businessesApi } from '@shu/api-client';

type WizardStep = 'MODE' | 'VEHICLE' | 'DRIVERS';
type VehicleType = 'MOTORCYCLE' | 'CAR' | 'VAN';

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
  const queryClient = useQueryClient();
  const [step, setStep] = useState<WizardStep>('MODE');
  const [vehicleType, setVehicleType] = useState<VehicleType>('MOTORCYCLE');
  const [pendingDriverId, setPendingDriverId] = useState<string | null>(null);

  const isBatch = orderIds.length > 1;

  const { data: business, isLoading: loadingBusiness } = useQuery({
    queryKey: ['business-mine'],
    queryFn: () => businessesApi.mine(),
    enabled: isOpen,
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['orders-batch', orderIds.join(',')],
    queryFn: () => Promise.all(orderIds.map(id => ordersApi.getById(id))),
    enabled: isOpen && orderIds.length > 0,
  });

  const totalQty = useMemo(() => {
    return orders.reduce((sum, order) => {
      return sum + (order.items?.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0) || 0);
    }, 0);
  }, [orders]);

  useEffect(() => {
    if (totalQty > 20) {
      setVehicleType('CAR');
    }
  }, [totalQty]);

  useEffect(() => {
    if (business && business.deliveryType === 'PLATFORM' && step === 'MODE') {
      setStep('VEHICLE');
    }
  }, [business, step]);

  const { data: drivers = [], isLoading: loadingDrivers } = useQuery({
    queryKey: ['available-drivers', deliveryAreaId, vehicleType],
    queryFn: () => driversApi.available(deliveryAreaId, vehicleType),
    enabled: isOpen && step === 'DRIVERS',
  });

  const setSelfDelivery = useMutation({
    mutationFn: async () => {
      await Promise.all(
        orderIds.map((id) =>
          ordersApi.updateStatus(id, { status: 'PICKED_UP' })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      onDriverAssigned();
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'حدث خطأ.');
    },
  });

  const sendRequest = useMutation({
    mutationFn: (driverId: string) => ordersApi.sendDriverRequest(orderIds, driverId, vehicleType),
    onSuccess: (_, driverId) => {
      setPendingDriverId(driverId);
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

  const requestCustomerContact = useMutation({
    mutationFn: async () => {
      await ordersApi.requestCustomerContact(orderIds, vehicleType);
      alert('تم إرسال طلب تواصل للمنصة. سيتم التواصل مع الزبون وإبلاغك بالنتيجة.');
      onClose();
    },
  });

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setStep('MODE');
      setPendingDriverId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-border flex justify-between items-center bg-surface-container-low">
          <div>
            <h2 className="text-xl font-bold text-on-surface">
              {step === 'MODE' ? 'كيف تريد توصيل الطلب؟' : step === 'VEHICLE' ? 'نوع المركبة' : 'اختيار سائق للتوصيل'}
            </h2>
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
          {loadingBusiness || loadingOrders ? (
            <div className="flex justify-center items-center py-12">
              <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
            </div>
          ) : pendingDriverId ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="material-symbols-outlined animate-spin text-4xl text-primary mb-4">progress_activity</span>
              <h3 className="text-xl font-bold text-on-surface">تم إرسال {isBatch ? 'الطلبات' : 'الطلب'} للسائق</h3>
              <p className="text-muted-gray mt-2">بانتظار القبول...</p>
            </div>
          ) : step === 'MODE' ? (
            <div className="space-y-4">
              <button
                onClick={() => setStep('VEHICLE')}
                className="w-full border border-border rounded-xl p-4 flex items-center gap-4 hover:border-primary transition-colors bg-surface text-right"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-3xl">directions_car</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-on-surface">سائق المنصة 🚗</h3>
                  <p className="text-sm text-muted-gray">إرسال الطلب لأحد سائقي منصة شو عبالك</p>
                </div>
                <span className="material-symbols-outlined text-muted-gray">arrow_forward_ios</span>
              </button>

              {business?.deliveryType === 'SELF' && (
                <button
                  onClick={() => {
                    if (confirm('هل أنت متأكد من توصيل الطلب بنفسك؟ سيتم تحويل حالة الطلب إلى (في الطريق).')) {
                      setSelfDelivery.mutate();
                    }
                  }}
                  className="w-full border border-border rounded-xl p-4 flex items-center gap-4 hover:border-success transition-colors bg-surface text-right"
                >
                  <div className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center text-success">
                    <span className="material-symbols-outlined text-3xl">storefront</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-on-surface">توصيل من المتجر 🏪</h3>
                    <p className="text-sm text-muted-gray">ستقوم أنت أو أحد موظفيك بتوصيل هذا الطلب</p>
                  </div>
                  <span className="material-symbols-outlined text-muted-gray">arrow_forward_ios</span>
                </button>
              )}
            </div>
          ) : step === 'VEHICLE' ? (
            <div className="space-y-4">
              {business?.deliveryType === 'SELF' && (
                <button onClick={() => setStep('MODE')} className="text-primary font-bold text-sm flex items-center gap-1 mb-4">
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  رجوع
                </button>
              )}

              {totalQty > 20 && (
                <div className="bg-warning/10 p-3 rounded-lg flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-warning">info</span>
                  <p className="text-sm text-warning font-bold">ننصح باختيار سيارة أو فان لأن حجم الطلب كبير ({totalQty} منتجات).</p>
                </div>
              )}

              {[
                { type: 'MOTORCYCLE', label: 'دراجة نارية 🏍️', desc: 'للطلبات الصغيرة والمتوسطة', icon: 'two_wheeler' },
                { type: 'CAR', label: 'سيارة 🚗', desc: 'للطلبات الكبيرة', icon: 'directions_car' },
                { type: 'VAN', label: 'فان 🚐', desc: 'للطلبات الكبيرة جداً أو البضائع', icon: 'local_shipping' },
              ].map(v => (
                <button
                  key={v.type}
                  onClick={() => setVehicleType(v.type as VehicleType)}
                  className={`w-full border-2 rounded-xl p-4 flex items-center gap-4 transition-colors text-right ${
                    vehicleType === v.type ? 'border-primary bg-primary' : 'border-border bg-surface hover:border-primary/50'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${vehicleType === v.type ? 'bg-white/20 text-white' : 'bg-surface-container text-muted-gray'}`}>
                    <span className="material-symbols-outlined text-2xl">{v.icon}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-lg ${vehicleType === v.type ? 'text-white' : 'text-on-surface'}`}>{v.label}</h3>
                    <p className={`text-sm ${vehicleType === v.type ? 'text-white/80' : 'text-muted-gray'}`}>{v.desc}</p>
                  </div>
                  {vehicleType === v.type && (
                    <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                  )}
                </button>
              ))}

              <button
                onClick={() => setStep('DRIVERS')}
                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl mt-4 transition-colors"
              >
                متابعة واختيار السائق
              </button>
            </div>
          ) : step === 'DRIVERS' ? (
            <div className="space-y-4">
              <button onClick={() => setStep('VEHICLE')} className="text-primary font-bold text-sm flex items-center gap-1 mb-2">
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
                تغيير المركبة ({vehicleType === 'CAR' ? 'سيارة' : vehicleType === 'VAN' ? 'فان' : 'دراجة'})
              </button>

              {loadingDrivers ? (
                <div className="flex justify-center items-center py-12">
                  <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
                </div>
              ) : drivers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-gray">
                  <span className="material-symbols-outlined text-5xl mb-4 opacity-50">directions_car</span>
                  <p className="text-lg font-medium mb-6 text-on-surface">لا يوجد سائقون بـ ({vehicleType === 'CAR' ? 'سيارة' : vehicleType === 'VAN' ? 'فان' : 'دراجة نارية'}) متاحون حالياً</p>
                  
                  {vehicleType !== 'MOTORCYCLE' && (
                    <div className="w-full space-y-3">
                      <button onClick={() => requestCustomerContact.mutate()} className="w-full bg-primary text-white font-bold py-3 rounded-xl">
                        طلب تواصل المنصة مع الزبون
                      </button>
                      <button onClick={() => {
                        if (confirm('هل أنت متأكد من إلغاء الطلب؟')) {
                          // cancellation logic
                        }
                      }} className="w-full bg-error/10 text-error font-bold py-3 rounded-xl hover:bg-error/20">
                        إلغاء الطلب
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {drivers.map((driver: any) => (
                    <div key={driver.id} className="border border-border rounded-xl p-4 flex items-center gap-4 hover:border-primary transition-colors bg-surface">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-xl">
                        {driver.vehicleType === 'CAR' ? '🚗' : driver.vehicleType === 'VAN' ? '🚐' : '🛵'}
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
                  {(vehicleType === 'CAR' || vehicleType === 'VAN') && (
                    <div className="bg-warning/10 p-3 rounded-lg border border-warning/30 mt-4">
                      <p className="text-xs text-warning-dark font-bold text-center">سيتم إبلاغ الزبون بتغيير الأجرة بسبب حجم الطلب المرتفع.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
