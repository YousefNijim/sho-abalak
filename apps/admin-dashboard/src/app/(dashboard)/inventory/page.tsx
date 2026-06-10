'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsApi, businessesApi } from '@shu/api-client';

export default function GlobalInventoryPage() {
  const [search, setSearch] = useState('');

  const { data: businesses = [] } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => businessesApi.list(),
  });

  const { data: lowStockAll = [], isLoading } = useQuery({
    queryKey: ['low-stock-all'],
    queryFn: () => productsApi.getLowStockAll(),
  });

  const stores = businesses.filter((b: any) => b.type === 'STORE');
  const emptyStock = lowStockAll.filter((p: any) => p.stock === 0);

  const filtered = lowStockAll.filter((p: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.business?.name || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">نظرة عامة على المخزون</h1>
        <p className="text-sm text-gray-500 mt-1">جميع المتاجر المسجّلة</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-2">
          <div className="flex justify-between items-center text-blue-600">
            <span className="material-symbols-outlined text-2xl">storefront</span>
            <span className="text-sm font-bold opacity-80">إجمالي المتاجر</span>
          </div>
          <p className="text-2xl font-black">{stores.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-orange-100 shadow-sm flex flex-col gap-2">
          <div className="flex justify-between items-center text-orange-600">
            <span className="material-symbols-outlined text-2xl">warning</span>
            <span className="text-sm font-bold opacity-80">منتجات بمخزون منخفض</span>
          </div>
          <p className="text-2xl font-black">{lowStockAll.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm flex flex-col gap-2">
          <div className="flex justify-between items-center text-red-600">
            <span className="material-symbols-outlined text-2xl">error</span>
            <span className="text-sm font-bold opacity-80">منتجات نفدت تماماً</span>
          </div>
          <p className="text-2xl font-black">{emptyStock.length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="font-bold text-gray-800">المنتجات منخفضة المخزون</h3>
          <div className="relative w-64">
            <input
              type="text"
              placeholder="ابحث باسم المنتج أو المتجر..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 px-4 rounded-xl border border-gray-200 outline-none focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">لا توجد منتجات منخفضة المخزون</div>
        ) : (
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3">المتجر</th>
                <th className="px-4 py-3">المنتج</th>
                <th className="px-4 py-3">التصنيف</th>
                <th className="px-4 py-3">الحالي</th>
                <th className="px-4 py-3">الحد الأدنى</th>
                <th className="px-4 py-3">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold text-blue-600">{p.business?.name || '—'}</td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.productCategory?.name || '—'}</td>
                  <td className="px-4 py-3 font-bold text-orange-600">{p.stock}</td>
                  <td className="px-4 py-3 text-gray-600">{p.lowStockAlert}</td>
                  <td className="px-4 py-3">
                    {p.stock === 0 ? (
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700">نفد تماماً</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">منخفض</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
