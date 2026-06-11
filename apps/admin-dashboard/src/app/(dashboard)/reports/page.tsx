'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi, businessesApi, areasApi, tagsApi } from '@shu/api-client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';

const PERIODS = [
  { id: 'today', label: 'اليوم' },
  { id: 'week', label: 'الأسبوع' },
  { id: 'month', label: 'الشهر' },
  { id: 'custom', label: 'مخصص' },
] as const;

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'بانتظار', CONFIRMED: 'مؤكد', PREPARING: 'تحضير',
  READY: 'جاهز', PICKED_UP: 'مع السائق', DELIVERED: 'مُسلَّم', CANCELLED: 'ملغى',
};

const fmt = (n: number) => n.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ReportsPage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [city, setCity] = useState('');
  const [tagId, setTagId] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const params: Record<string, string> = { period };
  if (period === 'custom') { params.startDate = startDate; params.endDate = endDate; }
  if (businessId) params.businessId = businessId;
  if (areaId) params.areaId = areaId;
  if (city) params.city = city;
  if (tagId) params.tagId = tagId;
  if (businessType) params.businessType = businessType;
  if (search) params.search = search;

  const { data, isLoading } = useQuery({
    queryKey: ['reports-finance', params],
    queryFn: () => reportsApi.getFinanceSummary(period, params.startDate, params.endDate, params),
  });

  const { data: businesses = [] } = useQuery({ queryKey: ['businesses-all'], queryFn: () => businessesApi.list({}) });
  const { data: areas = [] } = useQuery({ queryKey: ['areas'], queryFn: () => areasApi.list() });
  const { data: tags = [] } = useQuery({ queryKey: ['tags-food'], queryFn: () => tagsApi.list('FOOD') });

  const summary = (data as any)?.summary;
  const orders: any[] = (data as any)?.orders ?? [];

  const cities = [...new Set((areas as any[]).map((a: any) => a.city))];

  const handleSearch = () => setSearch(searchInput);

  // Aggregations
  const timeSeriesData = useMemo(() => {
    if (!orders.length) return [];
    const groups: Record<string, number> = {};
    orders.forEach(o => {
      if (o.status !== 'DELIVERED') return;
      const date = new Date(o.createdAt).toLocaleDateString('en-CA');
      groups[date] = (groups[date] || 0) + Number(o.subtotal) - Number(o.couponDiscount);
    });
    return Object.entries(groups).map(([date, revenue]) => ({ date, revenue })).sort((a,b) => a.date.localeCompare(b.date));
  }, [orders]);

  const topBusinessesData = useMemo(() => {
    if (!orders.length) return [];
    const groups: Record<string, number> = {};
    orders.forEach(o => {
      if (o.status !== 'DELIVERED') return;
      groups[o.businessName] = (groups[o.businessName] || 0) + Number(o.subtotal) - Number(o.couponDiscount);
    });
    return Object.entries(groups)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a,b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [orders]);

  const exportCsv = () => {
    const headers = ['رقم الطلب', 'المنشأة', 'المدينة', 'القرية', 'الزبون', 'السائق', 'مجموع المنتجات', 'الخصم', 'توصيل كلي', 'توصيل سائق', 'توصيل منصة', 'الإجمالي', 'ربح منشأة', 'ربح سائق', 'ربح منصة', 'طريقة الدفع', 'الحالة', 'التاريخ'];
    const rows = orders.map((o) => [o.id.slice(-6).toUpperCase(), o.businessName, o.businessCity, o.businessArea, o.customerName, o.driverName, o.subtotal, o.couponDiscount, o.deliveryFee, (o as any).driverDeliveryFee ?? 0, (o as any).platformDeliveryFee ?? 0, o.total, (o as any).businessEarnings ?? 0, (o as any).driverEarnings ?? 0, (o as any).platformEarnings ?? 0, o.paymentMethod, STATUS_LABELS[o.status] ?? o.status, new Date(o.createdAt).toLocaleDateString('ar-EG')]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `report_${period}_${Date.now()}.csv`; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={exportCsv} disabled={!orders.length} className="flex items-center gap-2 bg-secondary text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50">
          <span className="material-symbols-outlined text-base">download</span> تصدير CSV
        </button>
        <h1 className="text-2xl font-bold text-gray-800">التقارير المالية</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-3">
        {[
          { id: '', label: 'الكل', icon: '📊', color: 'border-gray-500 bg-gray-50 text-gray-800' },
          { id: 'FOOD', label: 'المطاعم', icon: '🍽️', color: 'border-orange-500 bg-orange-50 text-orange-800' },
          { id: 'STORE', label: 'المتاجر', icon: '🏪', color: 'border-blue-500 bg-blue-50 text-blue-800' }
        ].map((tab) => {
          const isActive = businessType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setBusinessType(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-lg transition-all border-2 ${
                isActive ? `${tab.color} shadow-md` : 'border-transparent bg-white shadow-sm hover:shadow-md'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <h2 className="font-bold text-gray-700 text-right">🔍 فلاتر البحث</h2>

        {/* Period */}
        <div className="flex gap-2 flex-wrap justify-end">
          {PERIODS.map((p) => (
            <button key={p.id} onClick={() => setPeriod(p.id)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${period === p.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-500 mb-1 text-right">إلى</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-xs text-gray-500 mb-1 text-right">من</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1 text-right">المنشأة</label>
            <select value={businessId} onChange={(e) => setBusinessId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">جميع المنشآت</option>
              {(businesses as any[]).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 text-right">المدينة</label>
            <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">جميع المدن</option>
              {cities.map((c) => <option key={c as string} value={c as string}>{c as string}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 text-right">القرية / المنطقة</label>
            <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">جميع المناطق</option>
              {(areas as any[]).filter((a: any) => !city || a.city === city).map((a: any) => <option key={a.id} value={a.id}>{a.city} - {a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 text-right">القسم / التاغ</label>
            <select value={tagId} onChange={(e) => setTagId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">جميع الأقسام</option>
              {(tags as any[]).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 text-right">بحث (اسم زبون/منشأة/سائق)</label>
            <div className="flex gap-2">
              <button onClick={handleSearch} className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-bold">بحث</button>
              <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="flex-1 border rounded-lg px-3 py-2 text-sm text-right" placeholder="ابحث..." />
            </div>
          </div>
        </div>

        {(businessId || city || areaId || tagId || businessType || search) && (
          <div className="flex justify-end">
            <button onClick={() => { setBusinessId(''); setCity(''); setAreaId(''); setTagId(''); setBusinessType(''); setSearch(''); setSearchInput(''); }} className="text-sm text-red-500 underline">مسح الفلاتر</button>
          </div>
        )}
      </div>

      {/* Summary cards */}
      {summary && (
        <>
          {/* Revenue breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'إجمالي المبيعات (قبل الخصم)', value: `${fmt(summary.totalSubtotal)} ₪`, icon: 'payments', color: 'bg-blue-50 text-blue-700' },
              { label: 'خصومات الكوبونات', value: `-${fmt(summary.totalCouponDiscount)} ₪`, icon: 'local_offer', color: 'bg-orange-50 text-orange-700' },
              { label: 'رسوم التوصيل الكلية', value: `${fmt(summary.totalDeliveryFees)} ₪`, icon: 'local_shipping', color: 'bg-purple-50 text-purple-700' },
              { label: 'الإجمالي النهائي للطلبات', value: `${fmt(summary.totalFinal)} ₪`, icon: 'receipt', color: 'bg-green-50 text-green-700' },
            ].map((c) => (
              <div key={c.label} className={`rounded-2xl p-4 ${c.color} flex flex-col gap-1`}>
                <div className="flex items-center justify-between"><span className="material-symbols-outlined text-xl">{c.icon}</span><span className="text-xs font-medium text-right opacity-75">{c.label}</span></div>
                <p className="text-xl font-extrabold text-right">{c.value}</p>
              </div>
            ))}
          </div>

          {/* Per-party earnings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl p-5 bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="material-symbols-outlined text-2xl text-primary">storefront</span>
                <span className="text-sm font-bold text-primary text-right">أرباح المنشآت</span>
              </div>
              <p className="text-2xl font-extrabold text-right text-primary">{fmt((summary as any).totalBusinessEarnings ?? 0)} ₪</p>
              <p className="text-xs text-primary/70 text-right mt-1">المبيعات - العمولة - خصم كوبونات المنشأة</p>
            </div>
            <div className="rounded-2xl p-5 bg-secondary/10 border border-secondary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="material-symbols-outlined text-2xl text-secondary">delivery_dining</span>
                <span className="text-sm font-bold text-secondary text-right">أرباح السائقين</span>
              </div>
              <p className="text-2xl font-extrabold text-right text-secondary">{fmt((summary as any).totalDriverEarnings ?? 0)} ₪</p>
              <p className="text-xs text-secondary/70 text-right mt-1">حصة السائق من رسوم التوصيل</p>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>رسوم توصيل السائق: {fmt((summary as any).totalDriverDeliveryFees ?? 0)} ₪</span>
              </div>
            </div>
            <div className="rounded-2xl p-5 bg-green-50 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="material-symbols-outlined text-2xl text-green-700">trending_up</span>
                <span className="text-sm font-bold text-green-700 text-right">أرباح المنصة</span>
              </div>
              <p className="text-2xl font-extrabold text-right text-green-700">{fmt((summary as any).totalPlatformEarnings ?? 0)} ₪</p>
              <p className="text-xs text-green-600/70 text-right mt-1">العمولة + حصة المنصة من التوصيل - خصم كوبونات المنصة</p>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>توصيل: {fmt((summary as any).totalPlatformDeliveryFees ?? 0)} ₪</span>
                <span>عمولة: {fmt(summary.totalCommission)} ₪</span>
              </div>
            </div>
          </div>

          {/* Order counts */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'إجمالي الطلبات', value: summary.ordersCount, icon: 'receipt_long', color: 'bg-gray-50 text-gray-700' },
              { label: 'طلبات مُسلَّمة', value: summary.deliveredCount, icon: 'check_circle', color: 'bg-green-50 text-green-700' },
              { label: 'طلبات ملغاة', value: summary.cancelledCount, icon: 'cancel', color: 'bg-red-50 text-red-600' },
            ].map((c) => (
              <div key={c.label} className={`rounded-2xl p-4 ${c.color} flex flex-col gap-1`}>
                <div className="flex items-center justify-between"><span className="material-symbols-outlined text-xl">{c.icon}</span><span className="text-xs font-medium text-right opacity-75">{c.label}</span></div>
                <p className="text-2xl font-extrabold text-right">{c.value}</p>
              </div>
            ))}
          </div>

          {/* Sales by Type */}
          {summary.breakdownByType && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6 mb-6">
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* FOOD */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-orange-500">restaurant</span>
                    المطاعم (FOOD)
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between"><span className="text-gray-500 text-sm">عدد الطلبات</span><span className="font-bold">{summary.breakdownByType.FOOD.orders}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500 text-sm">إجمالي المبيعات</span><span className="font-bold text-green-600">{fmt(summary.breakdownByType.FOOD.revenue)} ₪</span></div>
                    <div className="flex justify-between"><span className="text-gray-500 text-sm">عمولة المنصة</span><span className="font-bold text-blue-600">{fmt(summary.breakdownByType.FOOD.commission)} ₪</span></div>
                  </div>
                </div>

                {/* STORE */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-blue-500">storefront</span>
                    المتاجر (STORE)
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between"><span className="text-gray-500 text-sm">عدد الطلبات</span><span className="font-bold">{summary.breakdownByType.STORE.orders}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500 text-sm">إجمالي المبيعات</span><span className="font-bold text-green-600">{fmt(summary.breakdownByType.STORE.revenue)} ₪</span></div>
                    <div className="flex justify-between"><span className="text-gray-500 text-sm">المنتجات المباعة</span><span className="font-bold text-purple-600">{summary.breakdownByType.STORE.itemsSold}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500 text-sm">عمولة المنصة</span><span className="font-bold text-blue-600">{fmt(summary.breakdownByType.STORE.commission)} ₪</span></div>
                  </div>
                </div>
              </div>

              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6 mb-6">
                {/* Time Series Chart */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4 text-right">تطور الإيرادات بمرور الوقت</h3>
                  <div className="h-[250px]" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey="date" tick={{fontSize: 12}} tickMargin={10} />
                        <YAxis tick={{fontSize: 12}} tickFormatter={(val) => `${val} ₪`} width={60} />
                        <Tooltip formatter={(val: number) => [`${val.toFixed(2)} ₪`, 'الإيرادات']} labelStyle={{color: '#333'}} />
                        <Line type="monotone" dataKey="revenue" stroke={businessType === 'FOOD' ? '#f97316' : businessType === 'STORE' ? '#3b82f6' : '#10b981'} strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Distribution or Top 5 */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4 text-right">
                    {businessType === '' ? 'توزيع الطلبات: مطاعم vs متاجر' : `أفضل 5 ${businessType === 'FOOD' ? 'مطاعم' : 'متاجر'} (بالإيرادات)`}
                  </h3>
                  <div className="h-[250px]" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      {businessType === '' ? (
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'مطاعم', value: summary.breakdownByType.FOOD.orders },
                              { name: 'متاجر', value: summary.breakdownByType.STORE.orders }
                            ].filter(d => d.value > 0)}
                            cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                          >
                            <Cell key="cell-0" fill="#f97316" />
                            <Cell key="cell-1" fill="#3b82f6" />
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      ) : (
                        <BarChart data={topBusinessesData} layout="vertical" margin={{ left: 50 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                          <XAxis type="number" tick={{fontSize: 12}} tickFormatter={(val) => `${val}`} />
                          <YAxis type="category" dataKey="name" tick={{fontSize: 11}} width={80} />
                          <Tooltip formatter={(val: number) => [`${val.toFixed(2)} ₪`, 'الإيرادات']} />
                          <Bar dataKey="revenue" fill={businessType === 'FOOD' ? '#f97316' : '#3b82f6'} radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Orders table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">{orders.length} طلب</span>
          <h3 className="font-bold text-gray-800">تفاصيل الطلبات</h3>
        </div>
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">جاري تحميل البيانات...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs">
                <tr>
                  {['#', 'المنشأة', 'المدينة/القرية', 'الزبون', 'السائق', 'مجموع المنتجات', 'خصم', 'توصيل كلي', 'توصيل سائق', 'توصيل منصة', 'إجمالي', 'ربح منشأة', 'ربح سائق', 'ربح منصة', 'دفع', 'حالة', 'تاريخ'].map((h) => (
                    <th key={h} className="px-3 py-3 text-right font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs text-gray-400">{o.id.slice(-6).toUpperCase()}</td>
                    <td className="px-3 py-2 font-medium text-right whitespace-nowrap">{o.businessName}</td>
                    <td className="px-3 py-2 text-right text-xs text-gray-500">{o.businessCity} - {o.businessArea}</td>
                    <td className="px-3 py-2 text-right text-xs">{o.customerName}</td>
                    <td className="px-3 py-2 text-right text-xs">{o.driverName || '—'}</td>
                    <td className="px-3 py-2 text-right font-bold">{fmt(o.subtotal)} ₪</td>
                    <td className="px-3 py-2 text-right text-orange-600 whitespace-nowrap">
                      {o.couponDiscount > 0 ? (
                        <span title={`${o.couponCode} (${o.couponIssuedBy === 'PLATFORM' ? 'منصة' : 'منشأة'})`} className="cursor-help">-{fmt(o.couponDiscount)} ₪</span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">{fmt(o.deliveryFee)} ₪</td>
                    <td className="px-3 py-2 text-right text-secondary">{fmt(o.driverDeliveryFee ?? 0)} ₪</td>
                    <td className="px-3 py-2 text-right text-blue-600">{fmt(o.platformDeliveryFee ?? 0)} ₪</td>
                    <td className="px-3 py-2 text-right font-extrabold text-green-700">{fmt(o.total)} ₪</td>
                    <td className="px-3 py-2 text-right text-primary">{fmt(o.businessEarnings ?? 0)} ₪</td>
                    <td className="px-3 py-2 text-right text-secondary">{fmt(o.driverEarnings ?? 0)} ₪</td>
                    <td className="px-3 py-2 text-right text-green-700">{fmt(o.platformEarnings ?? 0)} ₪</td>
                    <td className="px-3 py-2 text-right text-xs">{o.paymentMethod === 'CASH' ? 'نقدي' : 'إلكتروني'}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${o.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : o.status === 'CANCELLED' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'}`}>
                        {STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-400 whitespace-nowrap">{new Date(o.createdAt).toLocaleDateString('ar-EG')}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={17} className="text-center py-12 text-gray-400">لا توجد بيانات للفترة المحددة</td></tr>
                )}
              </tbody>
              {orders.length > 0 && summary && (
                <tfoot className="bg-gray-100 font-bold text-gray-800 border-t-2 border-gray-200 text-sm">
                  <tr>
                    <td colSpan={5} className="px-3 py-3 text-right">المجموع ({summary.deliveredCount} مُسلَّم)</td>
                    <td className="px-3 py-3 text-right">{fmt(summary.totalSubtotal)} ₪</td>
                    <td className="px-3 py-3 text-right text-orange-600">-{fmt(summary.totalCouponDiscount)} ₪</td>
                    <td className="px-3 py-3 text-right">{fmt(summary.totalDeliveryFees)} ₪</td>
                    <td className="px-3 py-3 text-right text-secondary">{fmt((summary as any).totalDriverDeliveryFees ?? 0)} ₪</td>
                    <td className="px-3 py-3 text-right text-blue-600">{fmt((summary as any).totalPlatformDeliveryFees ?? 0)} ₪</td>
                    <td className="px-3 py-3 text-right text-green-700">{fmt(summary.totalFinal)} ₪</td>
                    <td className="px-3 py-3 text-right text-primary">{fmt((summary as any).totalBusinessEarnings ?? 0)} ₪</td>
                    <td className="px-3 py-3 text-right text-secondary">{fmt((summary as any).totalDriverEarnings ?? 0)} ₪</td>
                    <td className="px-3 py-3 text-right text-green-700">{fmt((summary as any).totalPlatformEarnings ?? 0)} ₪</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
