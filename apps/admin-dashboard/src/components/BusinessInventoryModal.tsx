'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi, categoriesApi } from '@shu/api-client';
import type { Business } from '@shu/api-client';

interface Props {
  business: Business;
  onClose: () => void;
}

export function BusinessInventoryModal({ business, onClose }: Props) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'lowStock'>('products');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('ALL');

  // Queries
  const { data: products = [], isLoading: isProductsLoading } = useQuery({
    queryKey: ['my-products', business.id],
    queryFn: () => productsApi.listByBusiness(business.id),
  });

  const { data: categories = [], isLoading: isCatsLoading } = useQuery({
    queryKey: ['my-categories', business.id],
    queryFn: () => categoriesApi.listByBusiness(business.id),
  });

  const { data: lowStock = [], isLoading: isLowStockLoading } = useQuery({
    queryKey: ['low-stock', business.id],
    queryFn: () => productsApi.getLowStock(business.id),
  });



  // Derived
  const filteredProducts = products.filter((p: any) => {
    if (catFilter !== 'ALL' && p.categoryId !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl h-[85vh] rounded-2xl bg-white shadow-xl border border-gray-200 flex flex-col overflow-hidden" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-gray-800">إدارة المخزون - {business.name}</h3>
            <p className="text-xs text-gray-500">ID: {business.id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition">
            <span className="material-symbols-outlined text-gray-600">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 p-4 border-b border-gray-100">
          {[
            { id: 'products', label: 'المنتجات' },
            { id: 'categories', label: 'التصنيفات' },
            { id: 'lowStock', label: 'المخزون المنخفض', badge: lowStock.length },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === t.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {t.label}
              {!!t.badge && (
                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 bg-gray-50/50">
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو الباركود..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
                <select
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white min-w-[200px]"
                >
                  <option value="ALL">جميع التصنيفات</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {isProductsLoading ? (
                <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm text-right">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3">الاسم</th>
                        <th className="px-4 py-3">التصنيف</th>
                        <th className="px-4 py-3">السعر</th>
                        <th className="px-4 py-3">المخزون</th>
                        <th className="px-4 py-3">الباركود</th>
                        <th className="px-4 py-3 text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredProducts.map((p: any) => {
                        const stockVal = p.stock;
                        const lowAlert = p.lowStockAlert ?? 0;
                        let badgeColor = 'bg-green-100 text-green-700';
                        let stockLabel = stockVal !== null ? stockVal.toString() : 'غير محدود';
                        
                        if (stockVal !== null && stockVal === 0) {
                          badgeColor = 'bg-red-100 text-red-700';
                          stockLabel = 'نفد (0)';
                        } else if (stockVal !== null && stockVal <= lowAlert) {
                          badgeColor = 'bg-orange-100 text-orange-700';
                          stockLabel = `منخفض (${stockVal})`;
                        }

                        return (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{p.name}</td>
                            <td className="px-4 py-3 text-gray-500">{p.productCategory?.name || p.category || '—'}</td>
                            <td className="px-4 py-3">{p.price} ₪</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${badgeColor}`}>
                                {stockLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-gray-500">{p.barcode || '—'}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${p.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {p.isAvailable ? 'متاح' : 'مخفي'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredProducts.length === 0 && (
                    <div className="text-center py-8 text-gray-500">لا توجد منتجات مطابقة</div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-4">
              {isCatsLoading ? (
                <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm text-right">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3">الترتيب</th>
                        <th className="px-4 py-3">اسم التصنيف</th>
                        <th className="px-4 py-3">عدد المنتجات (تقريبي)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {categories.map((c: any) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-500">{c.sortOrder ?? 0}</td>
                          <td className="px-4 py-3 font-bold">{c.name}</td>
                          <td className="px-4 py-3 text-gray-500">{products.filter((p: any) => p.categoryId === c.id).length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {categories.length === 0 && (
                    <div className="text-center py-8 text-gray-500">لا توجد تصنيفات</div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'lowStock' && (
            <div className="space-y-4">
              {isLowStockLoading ? (
                <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
              ) : lowStock.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-green-500 mb-2">check_circle</span>
                  <p className="text-lg font-bold text-gray-800">لا توجد منتجات بمخزون منخفض</p>
                  <p className="text-sm text-gray-500">كل شيء على ما يرام!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {lowStock.map((p: any) => (
                    <div key={p.id} className="bg-white p-4 rounded-xl border border-red-100 shadow-sm flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-gray-800">{p.name}</span>
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">تنبيه</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        الباركود: {p.barcode || '—'}
                      </div>
                      <div className="flex justify-between items-center mt-2 bg-gray-50 p-2 rounded-lg">
                        <div className="text-center flex-1">
                          <p className="text-[10px] text-gray-500">الحالي</p>
                          <p className={`font-bold ${p.stock === 0 ? 'text-red-600' : 'text-orange-600'}`}>{p.stock}</p>
                        </div>
                        <div className="w-px h-6 bg-gray-200" />
                        <div className="text-center flex-1">
                          <p className="text-[10px] text-gray-500">الحد الأدنى</p>
                          <p className="font-bold text-gray-700">{p.lowStockAlert}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
