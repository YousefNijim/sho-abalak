'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { productsApi, categoriesApi, businessCategoriesApi, uploadsApi, Product } from '@shu/api-client';
import { useBusiness } from '@/components/BusinessProvider';

export default function ProductsPage() {
  const router = useRouter();
  const { business, isStore } = useBusiness();
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL'|'IN_STOCK'|'LOW_STOCK'|'OUT_OF_STOCK'>('ALL');
  
  // Side Panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    mainCategoryId: '',
    subCategoryId: '',
    isAvailable: true,
    imageUrl: '',
    barcode: '',
    unit: '',
    stock: '',
    lowStockAlert: '5',
    hasVariants: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not STORE
  if (business && !isStore) {
    router.push('/menu');
    return null;
  }

  const { data: products = [], isLoading: isProductsLoading, refetch: refetchProducts } = useQuery({
    queryKey: ['products', business?.id],
    queryFn: () => productsApi.listByBusiness(business!.id),
    enabled: !!business,
  });

  // Admin-controlled templates
  const { data: templates = [], refetch: refetchTemplates } = useQuery({
    queryKey: ['my-templates', business?.id],
    queryFn: () => businessCategoriesApi.getMyTemplates(),
    enabled: !!business,
  });

  const toggleTemplate = useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
      businessCategoriesApi.toggle(id, isEnabled),
    onSuccess: () => refetchTemplates(),
  });

  const [templateId, setTemplateId] = useState<string | null>(null);

  const filteredProducts = products.filter(p => {
    if (templateId) {
      if ((p as any).templateId !== templateId) {
        // also match children
        const tpl = templates.find(t => t.id === templateId);
        const childIds = tpl?.children?.map((c: any) => c.id) ?? [];
        if (!childIds.includes((p as any).templateId)) return false;
      }
    }
    // @ts-ignore
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && p.barcode !== search) return false;
    
    // @ts-ignore - we assume product has stock/lowStockAlert properties added for store
    const stock = p.stock ?? null;
    // @ts-ignore
    const lowAlert = p.lowStockAlert ?? 5;
    
    if (stockFilter === 'OUT_OF_STOCK' && stock !== 0) return false;
    if (stockFilter === 'LOW_STOCK' && (stock === null || stock > lowAlert || stock === 0)) return false;
    if (stockFilter === 'IN_STOCK' && (stock === null || stock === 0)) return false;

    return true;
  });

  const handleToggleAvailable = async (product: Product) => {
    try {
      await productsApi.update(product.id, { isAvailable: !product.isAvailable });
      refetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      try {
        await productsApi.remove(id);
        refetchProducts();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleStockChange = async (productId: string, newStock: number) => {
    try {
      await productsApi.update(productId, { stock: newStock } as any);
      refetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({ 
      name: '', description: '', price: '', mainCategoryId: '', subCategoryId: '', isAvailable: true, 
      imageUrl: '', barcode: '', unit: '', stock: '', lowStockAlert: '5', hasVariants: false 
    });
    setIsPanelOpen(true);
  };

  const handleOpenEdit = (p: any) => {
    setEditingProduct(p);
    
    let mId = '';
    let sId = '';
    const catId = p.templateId;
    if (catId) {
      const mainCat = templates.find((c: any) => c.id === catId || c.children?.some((sub: any) => sub.id === catId));
      if (mainCat) {
        mId = mainCat.id;
        if (mainCat.id !== catId) {
          sId = catId;
        }
      }
    }

    setFormData({
      name: p.name,
      description: p.description || '',
      price: p.price.toString(),
      mainCategoryId: mId,
      subCategoryId: sId,
      isAvailable: p.isAvailable,
      imageUrl: p.imageUrl || '',
      barcode: p.barcode || '',
      unit: p.unit || '',
      stock: p.stock !== null && p.stock !== undefined ? p.stock.toString() : '',
      lowStockAlert: p.lowStockAlert?.toString() || '5',
      hasVariants: p.hasVariants || false,
    });
    setIsPanelOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadsApi.uploadImage(file);
      setFormData(prev => ({ ...prev, imageUrl: res.url }));
    } catch (err) {
      console.error(err);
      alert('فشل رفع الصورة');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    setIsSubmitting(true);
    try {
      const payload: any = {
        businessId: business.id,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        templateId: formData.subCategoryId || formData.mainCategoryId || undefined,
        isAvailable: formData.isAvailable,
        imageUrl: formData.imageUrl,
        barcode: formData.barcode,
        unit: formData.unit,
        stock: formData.stock ? parseInt(formData.stock) : null,
        lowStockAlert: parseInt(formData.lowStockAlert),
        hasVariants: formData.hasVariants,
      };

      if (editingProduct) {
        await productsApi.update(editingProduct.id, payload);
      } else {
        await productsApi.create(payload);
      }
      setIsPanelOpen(false);
      refetchProducts();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Barcode scanner
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();
    
    const handleKey = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      
      const now = Date.now();
      if (now - lastKeyTime > 100) buffer = '';
      lastKeyTime = now;
      
      if (e.key === 'Enter' && buffer.length > 3) {
        const code = buffer;
        buffer = '';
        
        // Find product
        const found = products.find((p: any) => p.barcode === code);
        if (found) {
          handleOpenEdit(found);
        } else {
          handleOpenAdd();
          setFormData(prev => ({ ...prev, barcode: code }));
        }
        return;
      }
      if (e.key.length === 1) buffer += e.key;
    };
    
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [products]);

  }, [products]);

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      {/* Left Panel - Categories */}
      <div className="hidden md:flex flex-col w-64 shrink-0 bg-surface border border-border rounded-xl shadow-sm overflow-hidden sticky top-6 max-h-[calc(100vh-3rem)]">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-bold text-on-surface">التصنيفات</h2>
          <p className="text-xs text-muted-gray mt-1">تُدار التصنيفات من قِبَل الإدارة</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
          <button
                onClick={() => setTemplateId(null)}
                className={`w-full text-right px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                  !templateId ? 'bg-primary/10 text-primary' : 'text-muted-gray hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                الكل
              </button>
              {templates.map((tpl: any) => (
                <div key={tpl.id} className="space-y-1">
                  <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer ${
                    templateId === tpl.id ? 'bg-primary/10' : 'hover:bg-surface-container-low'
                  }`}>
                    <label className="flex items-center gap-1.5 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={tpl.isEnabled !== false}
                        onChange={(e) => toggleTemplate.mutate({ id: tpl.id, isEnabled: e.target.checked })}
                        className="rounded"
                      />
                    </label>
                    <button
                      onClick={() => setTemplateId(templateId === tpl.id ? null : tpl.id)}
                      className={`flex-1 text-right text-sm font-bold mr-2 ${templateId === tpl.id ? 'text-primary' : 'text-on-surface'}`}
                    >
                      {tpl.name}
                    </button>
                  </div>
                  {(tpl.children ?? []).map((child: any) => (
                    <div key={child.id} className={`flex items-center justify-between pr-6 pl-3 py-1.5 rounded-lg cursor-pointer ${
                      templateId === child.id ? 'bg-primary/5' : 'hover:bg-surface-container-low'
                    }`}>
                      <label className="flex items-center gap-1.5 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={child.isEnabled !== false}
                          onChange={(e) => toggleTemplate.mutate({ id: child.id, isEnabled: e.target.checked })}
                          className="rounded"
                        />
                      </label>
                      <button
                        onClick={() => setTemplateId(templateId === child.id ? null : child.id)}
                        className={`flex-1 text-right text-xs font-medium mr-2 ${templateId === child.id ? 'text-primary' : 'text-muted-gray'}`}
                      >
                        ↳ {child.name}
                      </button>
                    </div>
                  ))}
                </div>
              ))}
        </div>
      </div>

      <div className="flex-1 space-y-6 w-full min-w-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-on-surface">إدارة المنتجات والمخزون</h1>
        <button 
          onClick={handleOpenAdd}
          className="bg-primary text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined">add</span>
          إضافة منتج
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-muted-gray">search</span>
          <input
            type="text"
            placeholder="البحث بالاسم أو الباركود..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-4 pr-10 py-2 bg-surface-container-low border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        
        <select 
          value={templateId || 'ALL'} 
          onChange={(e) => setTemplateId(e.target.value === 'ALL' ? null : e.target.value)}
          className="bg-surface-container-low border border-border rounded-xl px-4 py-2 outline-none font-bold text-sm min-w-[150px] w-full md:w-auto"
        >
          <option value="ALL">كل الأقسام</option>
          {templates.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <div className="flex bg-surface-container-low border border-border rounded-xl overflow-hidden w-full md:w-auto">
          {(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStockFilter(f)}
              className={`px-3 py-2 text-xs font-bold transition-colors flex-1 md:flex-none ${
                stockFilter === f ? 'bg-primary text-white' : 'text-muted-gray hover:bg-surface'
              }`}
            >
              {f === 'ALL' ? 'الكل' : f === 'IN_STOCK' ? 'متوفر' : f === 'LOW_STOCK' ? 'منخفض' : 'نفد'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm whitespace-nowrap min-w-[800px]">
            <thead className="bg-surface-container-low border-b border-border text-muted-gray">
              <tr>
                <th className="px-4 py-3 font-bold w-12 text-center">صورة</th>
                <th className="px-4 py-3 font-bold">الاسم</th>
                <th className="px-4 py-3 font-bold">التصنيف</th>
                <th className="px-4 py-3 font-bold">السعر</th>
                <th className="px-4 py-3 font-bold">المخزون</th>
                <th className="px-4 py-3 font-bold">الباركود</th>
                <th className="px-4 py-3 font-bold">الحالة</th>
                <th className="px-4 py-3 font-bold text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isProductsLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-gray">جاري التحميل...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-gray">لا توجد منتجات</td></tr>
              ) : (
                filteredProducts.map((p: any) => {
                  const stock = p.stock ?? null;
                  const lowAlert = p.lowStockAlert ?? 5;
                  
                  return (
                    <tr key={p.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-4 py-2">
                        <div className="w-10 h-10 rounded border border-border bg-surface-container overflow-hidden mx-auto">
                          {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-muted-gray flex items-center justify-center w-full h-full">image</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2 font-bold text-on-surface">{p.name} {p.unit && <span className="text-xs text-muted-gray font-normal mr-1">/ {p.unit}</span>}</td>
                      <td className="px-4 py-2 text-muted-gray text-xs">
                        {(() => {
                          const catId = p.templateId;
                          if (!catId) return 'بدون تصنيف';
                          const mainCat = templates.find((c: any) => c.id === catId || c.children?.some((sub: any) => sub.id === catId));
                          if (mainCat) {
                            if (mainCat.id === catId) return mainCat.name;
                            const sub = mainCat.children?.find((sub: any) => sub.id === catId);
                            return sub ? `${mainCat.name} > ${sub.name}` : mainCat.name;
                          }
                          return 'بدون تصنيف';
                        })()}
                      </td>
                      <td className="px-4 py-2 font-bold text-primary">{Number(p.price).toFixed(2)} ش</td>
                      <td className="px-4 py-2">
                        {stock === null ? <span className="text-muted-gray">—</span> : (
                          <input 
                            type="number" 
                            className={`w-20 px-2 py-1 rounded border outline-none font-bold text-center ${
                              stock === 0 ? 'bg-error/10 text-error border-error/30' : 
                              stock <= lowAlert ? 'bg-warning/10 text-warning border-warning/30' : 
                              'bg-surface border-border text-on-surface focus:border-primary'
                            }`}
                            defaultValue={stock}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val) && val !== stock) handleStockChange(p.id, val);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur();
                            }}
                          />
                        )}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-muted-gray" dir="ltr">{p.barcode || '—'}</td>
                      <td className="px-4 py-2">
                        <button 
                          onClick={() => handleToggleAvailable(p)}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold ${
                            p.isAvailable ? 'bg-success/10 text-success' : 'bg-muted-gray/10 text-muted-gray'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          {p.isAvailable ? 'متاح' : 'غير متاح'}
                        </button>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleOpenEdit(p)} className="w-8 h-8 rounded-lg bg-surface border border-border text-primary hover:bg-primary/10 flex items-center justify-center transition-colors">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="w-8 h-8 rounded-lg bg-surface border border-border text-error hover:bg-error/10 flex items-center justify-center transition-colors">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Panel Overlay */}
      {isPanelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-opacity">
          <div className="bg-surface w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-left-full duration-300">
            <div className="flex justify-between items-center p-6 border-b border-border bg-surface-container-low">
              <h2 className="text-xl font-bold text-on-surface">{editingProduct ? 'تعديل منتج' : 'إضافة منتج جديد'}</h2>
              <button onClick={() => setIsPanelOpen(false)} className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center text-muted-gray transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
              <div className="flex justify-center mb-6">
                <label className="relative w-32 h-32 rounded-2xl border-2 border-dashed border-border bg-surface-container-low flex flex-col items-center justify-center cursor-pointer hover:bg-surface-container hover:border-primary transition-all group overflow-hidden shadow-sm">
                  {formData.imageUrl ? (
                    <>
                      <img src={formData.imageUrl} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                        <span className="material-symbols-outlined mb-1">edit</span>
                        <span className="text-xs font-bold">تغيير الصورة</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-4xl text-muted-gray mb-2 group-hover:text-primary transition-colors">add_photo_alternate</span>
                      <span className="text-sm font-bold text-muted-gray group-hover:text-primary transition-colors">إضافة صورة</span>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface mb-2">اسم المنتج *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-shadow" placeholder="مثال: تفاح أحمر" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-on-surface mb-2">السعر (شيكل) *</label>
                  <input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-shadow" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface mb-2">الباركود</label>
                  <input type="text" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-shadow" placeholder="اختياري" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-on-surface mb-2">التصنيف الرئيسي</label>
                  <select
                    value={formData.mainCategoryId}
                    onChange={e => setFormData({...formData, mainCategoryId: e.target.value, subCategoryId: ''})}
                    className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-shadow"
                  >
                    <option value="">اختر التصنيف</option>
                    {templates.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface mb-2">التصنيف الفرعي</label>
                  <select
                    value={formData.subCategoryId}
                    onChange={e => setFormData({...formData, subCategoryId: e.target.value})}
                    className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-shadow disabled:opacity-50"
                    disabled={!formData.mainCategoryId}
                  >
                    <option value="">بدون تصنيف فرعي</option>
                    {templates
                      .find((c: any) => c.id === formData.mainCategoryId)
                      ?.children?.map((sub: any) => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-on-surface mb-2">الكمية في المخزن</label>
                  <input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-shadow" placeholder="غير محدود" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface mb-2">وحدة القياس</label>
                  <input type="text" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-shadow" placeholder="كغ، قطعة..." />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface mb-2">تنبيه المخزون المنخفض</label>
                <input type="number" value={formData.lowStockAlert} onChange={e => setFormData({...formData, lowStockAlert: e.target.value})} className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-shadow" placeholder="5" />
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface mb-2">وصف المنتج</label>
                <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-shadow resize-none" placeholder="وصف قصير للمنتج..." />
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-border">
                <span className="font-bold text-sm text-on-surface">متاح للطلب</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={formData.isAvailable} onChange={e => setFormData({...formData, isAvailable: e.target.checked})} />
                  <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success"></div>
                </label>
              </div>
            </form>
            
            <div className="p-6 border-t border-border bg-surface-container-low flex gap-3">
              <button type="button" onClick={() => setIsPanelOpen(false)} className="flex-1 px-4 py-3 bg-surface border border-border rounded-xl font-bold hover:bg-surface-container transition-colors">إلغاء</button>
              <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-colors disabled:opacity-70 flex justify-center items-center gap-2">
                {isSubmitting ? <span className="material-symbols-outlined animate-spin">refresh</span> : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
