'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { businessesApi, ordersApi } from '@shu/api-client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

const PERIODS = ['اليوم', 'هذا الأسبوع', 'هذا الشهر'];
const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6'];

export default function AnalyticsPage() {
  const [periodIdx, setPeriodIdx] = useState(0);

  const { data: business, isLoading: isBusinessLoading } = useQuery({
    queryKey: ['business-mine'],
    queryFn: () => businessesApi.mine(),
  });

  const { data: orders = [], isLoading: isOrdersLoading } = useQuery({
    queryKey: ['orders-analytics'],
    // Fetch a large limit for proper analytics on the client side
    queryFn: () => ordersApi.list({ limit: 5000 }),
  });

  const isLoading = isBusinessLoading || isOrdersLoading;

  // Filter orders by selected period
  const periodOrders = useMemo(() => {
    const now = new Date();
    return orders.filter((o: any) => {
      try {
        const d = new Date(o.createdAt);
        if (periodIdx === 0) { // Today
          return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        } else if (periodIdx === 1) { // This Week (last 7 days)
          const diff = now.getTime() - d.getTime();
          return diff <= 7 * 24 * 60 * 60 * 1000;
        } else { // This Month (last 30 days)
          const diff = now.getTime() - d.getTime();
          return diff <= 30 * 24 * 60 * 60 * 1000;
        }
      } catch {
        return false;
      }
    });
  }, [orders, periodIdx]);

  const completedOrders = useMemo(() => periodOrders.filter((o: any) => o.status === 'DELIVERED'), [periodOrders]);

  const commissionRate = Number(business?.commissionRate ?? 10);

  const totalSales = useMemo(() => {
    return Math.round(completedOrders.reduce((acc: number, o: any) => {
      const sub = o.subtotal != null ? Number(o.subtotal) : Number(o.total || 0);
      return acc + sub;
    }, 0) * 100) / 100;
  }, [completedOrders]);

  const avgOrder = completedOrders.length > 0 ? Math.round((totalSales / completedOrders.length) * 100) / 100 : 0;

  const netEarnings = useMemo(() => {
    return Math.round(completedOrders.reduce((acc: number, o: any) => {
      const sub = o.subtotal != null ? Number(o.subtotal) : Number(o.total || 0);
      const businessCoupon = o.couponIssuedBy === 'BUSINESS' ? Number(o.couponDiscount || 0) : 0;
      const net = sub - businessCoupon;
      const commission = net * (commissionRate / 100);
      return acc + (net - commission);
    }, 0) * 100) / 100;
  }, [completedOrders, commissionRate]);

  // Top Products
  const topProducts = useMemo(() => {
    const counts: Record<string, number> = {};
    completedOrders.forEach((o: any) => {
      o.items?.forEach((it: any) => {
        const name = it.product?.name || 'منتج غير معروف';
        counts[name] = (counts[name] || 0) + Number(it.quantity || 0);
      });
    });
    return Object.keys(counts)
      .map((name) => ({ name, count: counts[name] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [completedOrders]);

  // Chart Data (Orders count by day/hour)
  const chartData = useMemo(() => {
    if (periodIdx === 0) {
      // Today: bucket by hour
      const counts = Array(24).fill(0).map((_, i) => ({ label: `${i}:00`, orders: 0, revenue: 0 }));
      periodOrders.forEach((o: any) => {
        try { 
          const h = new Date(o.createdAt).getHours();
          counts[h].orders += 1; 
          if (o.status === 'DELIVERED') {
            const sub = o.subtotal != null ? Number(o.subtotal) : Number(o.total || 0);
            counts[h].revenue += sub;
          }
        } catch {}
      });
      // Show every 3rd hour or filter zeroes if needed, but Recharts handles many points well
      return counts;
    } else {
      // Week/Month: bucket by day of week
      const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const counts = Array(7).fill(0).map((_, i) => ({ label: days[i], orders: 0, revenue: 0 }));
      periodOrders.forEach((o: any) => {
        try { 
          const d = new Date(o.createdAt).getDay();
          counts[d].orders += 1;
          if (o.status === 'DELIVERED') {
            const sub = o.subtotal != null ? Number(o.subtotal) : Number(o.total || 0);
            counts[d].revenue += sub;
          }
        } catch {}
      });
      return counts;
    }
  }, [periodOrders, periodIdx]);

  // Status Pie Chart
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {
      'مكتملة': 0,
      'ملغاة': 0,
      'قيد التنفيذ': 0,
    };
    periodOrders.forEach((o: any) => {
      if (o.status === 'DELIVERED') counts['مكتملة']++;
      else if (o.status === 'CANCELLED') counts['ملغاة']++;
      else counts['قيد التنفيذ']++;
    });
    return Object.keys(counts).map(k => ({ name: k, value: counts[k] })).filter(d => d.value > 0);
  }, [periodOrders]);

  const handleExportCSV = () => {
    const csvContent = [
      ['رقم الطلب', 'التاريخ', 'حالة الطلب', 'الإجمالي', 'صافي المتجر', 'العميل'],
      ...completedOrders.map((o: any) => {
        const sub = o.subtotal != null ? Number(o.subtotal) : Number(o.total || 0);
        const businessCoupon = o.couponIssuedBy === 'BUSINESS' ? Number(o.couponDiscount || 0) : 0;
        const net = sub - businessCoupon;
        const commission = net * (commissionRate / 100);
        const netStore = Math.round((net - commission) * 100) / 100;
        
        return [
          o.id,
          new Date(o.createdAt).toLocaleString('ar-EG'),
          o.status,
          sub,
          netStore,
          o.customer?.name || 'غير معروف'
        ];
      })
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `تقارير_المبيعات_${PERIODS[periodIdx]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <span className="material-symbols-outlined animate-spin text-5xl text-primary">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">insights</span>
          الإحصائيات والتقارير
        </h1>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-surface text-primary border border-primary px-4 py-2 rounded-lg font-bold hover:bg-primary/5 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            تصدير CSV
          </button>
          
          <div className="bg-surface rounded-lg border border-border p-1 flex">
            {PERIODS.map((p, i) => (
              <button
                key={p}
                onClick={() => setPeriodIdx(i)}
                className={`px-4 py-1.5 text-sm font-bold rounded-md transition-colors ${
                  periodIdx === i ? 'bg-primary text-white' : 'text-muted-gray hover:bg-surface-container-low'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col justify-between">
          <p className="text-muted-gray text-sm mb-2">إجمالي الطلبات</p>
          <p className="text-3xl font-extrabold text-on-surface">{periodOrders.length}</p>
        </div>
        <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col justify-between">
          <p className="text-muted-gray text-sm mb-2">إجمالي مبيعات المنتجات</p>
          <p className="text-3xl font-extrabold text-on-surface">{totalSales} ₪</p>
        </div>
        <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col justify-between">
          <p className="text-muted-gray text-sm mb-2">صافي الأرباح (بعد العمولة)</p>
          <p className="text-3xl font-extrabold text-success">{netEarnings} ₪</p>
        </div>
        <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col justify-between">
          <p className="text-muted-gray text-sm mb-2">متوسط قيمة الطلب</p>
          <p className="text-3xl font-extrabold text-on-surface">{avgOrder} ₪</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue/Orders Line Chart */}
        <div className="bg-surface p-6 rounded-xl border border-border shadow-sm lg:col-span-2 min-h-[350px] flex flex-col">
          <h2 className="text-lg font-bold text-on-surface mb-6">المبيعات وعدد الطلبات ({PERIODS[periodIdx]})</h2>
          <div className="flex-1 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="label" stroke="#9ca3af" fontSize={12} tickMargin={10} />
                <YAxis yAxisId="left" stroke="#E6781E" fontSize={12} tickFormatter={v => `${v} ₪`} />
                <YAxis yAxisId="right" orientation="right" stroke="#10B981" fontSize={12} allowDecimals={false} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', textAlign: 'right' }}
                  itemStyle={{ textAlign: 'right' }}
                  labelStyle={{ fontWeight: 'bold', marginBottom: '8px', color: '#111827', textAlign: 'right' }}
                  formatter={(value: number, name: string) => [
                    name === 'revenue' ? `${value} ₪` : value, 
                    name === 'revenue' ? 'المبيعات' : 'عدد الطلبات'
                  ]}
                />
                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#E6781E" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="revenue" />
                <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="orders" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-lg font-bold text-on-surface mb-6">أكثر المنتجات مبيعاً</h2>
          <div className="flex-1 w-full h-[250px]" dir="ltr">
            {topProducts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-gray text-sm text-center">
                لا توجد بيانات لمنتجات مكتملة في هذه الفترة
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 0, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#4b5563" fontSize={12} width={100} tick={{ fill: '#374151' }} />
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(230,120,30,0.1)' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', textAlign: 'right' }}
                    formatter={(val: number) => [`${val} وحدة`, 'الكمية المباعة']}
                  />
                  <Bar dataKey="count" fill="#E6781E" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Pie Chart */}
        <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-lg font-bold text-on-surface mb-6">حالة الطلبات</h2>
          <div className="w-full h-[250px]" dir="ltr">
            {periodOrders.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-gray text-sm">
                لا توجد طلبات في هذه الفترة
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {statusData.map((entry, index) => {
                      let color = COLORS[index % COLORS.length];
                      if (entry.name === 'مكتملة') color = '#10B981';
                      if (entry.name === 'ملغاة') color = '#EF4444';
                      if (entry.name === 'قيد التنفيذ') color = '#F59E0B';
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', textAlign: 'right' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Commission Summary */}
        <div className="bg-surface p-6 rounded-xl border border-border shadow-sm lg:col-span-2">
          <h2 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">account_balance</span>
            الملخص المالي والتسويات
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface-container-low p-4 rounded-lg border border-border">
              <p className="text-sm text-muted-gray mb-1">إجمالي المبيعات المكتملة</p>
              <p className="text-xl font-bold text-on-surface">{totalSales} ₪</p>
            </div>
            <div className="bg-error/10 p-4 rounded-lg border border-error/20">
              <p className="text-sm text-error mb-1">العمولة للمنصة ({commissionRate}%)</p>
              <p className="text-xl font-bold text-error">-{Math.round((totalSales * (commissionRate / 100)) * 100) / 100} ₪</p>
            </div>
            <div className="bg-success/10 p-4 rounded-lg border border-success/20">
              <p className="text-sm text-success mb-1">صافي أرباح المنشأة</p>
              <p className="text-xl font-bold text-success">{netEarnings} ₪</p>
            </div>
          </div>

          <div className="mt-8 p-5 bg-surface-container-high border-r-4 border-r-primary rounded-lg">
            <h3 className="font-bold text-on-surface mb-2">رصيدك المالي الحالي لدى المنصة</h3>
            <div className="flex items-end gap-3">
              <p className="text-3xl font-extrabold text-primary">{Number(business?.platformBalance ?? 0).toFixed(2)} ₪</p>
              <p className="text-sm text-muted-gray mb-1">
                (يتم تصفير هذا الرصيد بعد كل دورة تسوية مالية مع الإدارة)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
