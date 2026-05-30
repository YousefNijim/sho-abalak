'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@shu/api-client';

export default function SettingsPage() {
  const qc = useQueryClient();

  // Form states
  const [defaultCommission, setDefaultCommission] = useState<number>(10.0);
  const [baseDeliveryFee, setBaseDeliveryFee] = useState<number>(3.0);
  const [customerAppActive, setCustomerAppActive] = useState<boolean>(true);
  const [businessAppActive, setBusinessAppActive] = useState<boolean>(true);
  const [driverAppActive, setDriverAppActive] = useState<boolean>(true);

  // Success/Error Toasts
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Query Settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
  });

  // Sync state with loaded data
  useEffect(() => {
    if (settings) {
      setDefaultCommission(Number(settings.defaultCommission));
      setBaseDeliveryFee(Number(settings.baseDeliveryFee));
      setCustomerAppActive(settings.customerAppActive);
      setBusinessAppActive(settings.businessAppActive);
      setDriverAppActive(settings.driverAppActive);
    }
  }, [settings]);

  // Update mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (dto: {
      defaultCommission: number;
      baseDeliveryFee: number;
      customerAppActive: boolean;
      businessAppActive: boolean;
      driverAppActive: boolean;
    }) => settingsApi.update(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      showToast('success', 'تم حفظ وإطلاق الإعدادات الشاملة للمنصة بنجاح');
    },
    onError: (err: any) => {
      showToast('error', err.response?.data?.message || 'فشل تحديث الإعدادات');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate({
      defaultCommission,
      baseDeliveryFee,
      customerAppActive,
      businessAppActive,
      driverAppActive,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-gray" dir="rtl">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="text-[13px] font-bold">جاري تحميل إعدادات النظام الحالية...</span>
      </div>
    );
  }

  return (
    <>
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-4 left-4 z-50 flex items-center gap-3 rounded-xl px-5 py-3.5 text-white shadow-lg`}
          style={{ backgroundColor: toast.type === 'success' ? '#165A34' : '#EF4444' }}
          dir="rtl"
        >
          <span className="material-symbols-outlined">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="text-[13px] font-bold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-1 text-right" dir="rtl">
        <h2 className="text-2xl font-bold text-on-surface">إعدادات المنصة الشاملة</h2>
        <p className="text-[12px] text-muted-gray mt-0.5">ضبط معايير التشغيل، العمولات الافتراضية، ومفاتيح تشغيل وإيقاف تطبيقات الهواتف الذكية</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-margin-standard space-y-margin-standard" dir="rtl">
        <div className="grid grid-cols-1 gap-margin-standard lg:grid-cols-2">
          
          {/* Card 1: Defaults pricing */}
          <div className="rounded-xl border border-border-beige bg-surface-white p-6 shadow-sm flex flex-col gap-5">
            <div className="border-b border-border-beige pb-3">
              <h3 className="text-[16px] font-bold text-on-surface">التسعير والعمولات الافتراضية</h3>
              <p className="text-[11px] text-muted-gray mt-0.5">القيم التلقائية المعتمدة للمتاجر والعمليات الجديدة على المنصة</p>
            </div>

            {/* Default Commission Input */}
            <div className="space-y-1.5">
              <label className="block text-[12px] font-bold text-on-surface">عمولة المنصة الافتراضية (%)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={defaultCommission}
                  onChange={(e) => setDefaultCommission(parseFloat(e.target.value) || 0)}
                  className="h-11 w-full rounded-lg border border-border-beige pr-3 pl-12 text-[13px] text-on-surface font-semibold focus:border-primary focus:outline-none"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-gray font-bold text-sm">%</span>
              </div>
              <p className="text-[10px] text-muted-gray">النسبة التي تستقطعها المنصة تلقائياً من المبيعات الفرعية لكل متجر جديد.</p>
            </div>

            {/* Base Delivery Fee Input */}
            <div className="space-y-1.5">
              <label className="block text-[12px] font-bold text-on-surface">رسوم التوصيل الأساسية للمنصة (₪)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={baseDeliveryFee}
                  onChange={(e) => setBaseDeliveryFee(parseFloat(e.target.value) || 0)}
                  className="h-11 w-full rounded-lg border border-border-beige pr-3 pl-12 text-[13px] text-on-surface font-semibold focus:border-primary focus:outline-none"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-gray font-bold text-sm">₪</span>
              </div>
              <p className="text-[10px] text-muted-gray">أجرة التوصيل التلقائية للمناطق الجديدة المضافة للنظام.</p>
            </div>
          </div>

          {/* Card 2: Applications Active Toggles */}
          <div className="rounded-xl border border-border-beige bg-surface-white p-6 shadow-sm flex flex-col gap-5">
            <div className="border-b border-border-beige pb-3">
              <h3 className="text-[16px] font-bold text-on-surface">إتاحة وتفعيل تطبيقات الخدمة</h3>
              <p className="text-[11px] text-muted-gray mt-0.5">التحكم في تشغيل أو إغلاق التطبيقات مؤقتاً للصيانة أو الطوارئ</p>
            </div>

            <div className="space-y-4">
              {/* Customer App Active Toggle */}
              <div className="flex items-center justify-between rounded-lg bg-surface-container-low/40 p-4 border border-border-beige/50">
                <div>
                  <span className="font-bold text-[13px] text-on-surface">تطبيق الزبون (Customer App)</span>
                  <p className="text-[10px] text-muted-gray mt-0.5">تعطيله يمنع الزبائن من تصفح المتاجر أو عمل طلبيات جديدة.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomerAppActive(!customerAppActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    customerAppActive ? 'bg-secondary' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      customerAppActive ? '-translate-x-6' : '-translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Business App Active Toggle */}
              <div className="flex items-center justify-between rounded-lg bg-surface-container-low/40 p-4 border border-border-beige/50">
                <div>
                  <span className="font-bold text-[13px] text-on-surface">تطبيق المتاجر الشريكة (Business App)</span>
                  <p className="text-[10px] text-muted-gray mt-0.5">إغلاقه يمنع أصحاب المحلات من تسجيل الدخول أو استقبال الطلبيات.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBusinessAppActive(!businessAppActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    businessAppActive ? 'bg-secondary' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      businessAppActive ? '-translate-x-6' : '-translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Driver App Active Toggle */}
              <div className="flex items-center justify-between rounded-lg bg-surface-container-low/40 p-4 border border-border-beige/50">
                <div>
                  <span className="font-bold text-[13px] text-on-surface">تطبيق الكباتن / السائقين (Driver App)</span>
                  <p className="text-[10px] text-muted-gray mt-0.5">تعطيله يمنع عمال التوصيل من تغيير حالتهم أو توصيل الطلبيات.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDriverAppActive(!driverAppActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    driverAppActive ? 'bg-secondary' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      driverAppActive ? '-translate-x-6' : '-translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Form Submit Footer */}
        <div className="flex justify-end gap-3 border-t border-border-beige pt-5">
          <button
            type="submit"
            disabled={
              defaultCommission < 0 ||
              defaultCommission > 100 ||
              baseDeliveryFee < 0 ||
              updateSettingsMutation.isPending
            }
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-8 font-bold text-white shadow-md hover:bg-primary/95 transition-all disabled:opacity-50"
          >
            {updateSettingsMutation.isPending && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            حفظ وإطلاق إعدادات المنصة
          </button>
        </div>
      </form>
    </>
  );
}
