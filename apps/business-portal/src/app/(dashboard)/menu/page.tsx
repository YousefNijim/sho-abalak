'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { productsApi, uploadsApi, categoriesApi, Product } from '@shu/api-client';
import { useBusiness } from '@/components/BusinessProvider';

export default function MenuPage() {
  const router = useRouter();
  const { business, isFood } = useBusiness();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  
  // Side Panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Category Form State
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    isAvailable: true,
    imageUrl: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not FOOD
  if (business && !isFood) {
    router.push('/products');
    return null;
  }

  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ['products', business?.id],
    queryFn: () => productsApi.listByBusiness(business!.id),
    enabled: !!business,
  });

  const { data: dbCategories = [], refetch: refetchCategories } = useQuery({
    queryKey: ['categories', business?.id],
    queryFn: () => categoriesApi.listByBusiness(business!.id),
    enabled: !!business,
  });

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    dbCategories.forEach((c: any) => cats.add(c.name));
    return ['الكل', ...Array.from(cats)];
  }, [products, dbCategories]);

  const filteredProducts = products.filter(p => {
    if (selectedCategory !== 'الكل' && p.category !== selectedCategory) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleToggleAvailable = async (product: Product) => {
    try {
      await productsApi.update(product.id, { isAvailable: !product.isAvailable });
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      try {
        await productsApi.remove(id);
        refetch();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({ name: '', description: '', price: '', category: '', isAvailable: true, imageUrl: '' });
    setIsPanelOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      description: p.description || '',
      price: p.price.toString(),
      category: p.category || '',
      isAvailable: p.isAvailable,
      imageUrl: p.imageUrl || '',
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
      const payload = {
        businessId: business.id,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        isAvailable: formData.isAvailable,
        imageUrl: formData.imageUrl,
      };

      if (editingProduct) {
        await productsApi.update(editingProduct.id, payload);
      } else {
        await productsApi.create(payload);
      }
      setIsPanelOpen(false);
      refetch();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || !business) return;
    setIsSubmittingCategory(true);
    try {
      await categoriesApi.create({
        businessId: business.id,
        name: newCategoryName.trim()
      });
      setNewCategoryName('');
      setIsAddingCategory(false);
      refetchCategories();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إضافة التصنيف');
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  return (
    <div className="flex h-full gap-6">
      {/* Left Panel - Categories */}
      <div className="hidden md:flex flex-col w-64 shrink-0 bg-surface border border-border rounded-xl shadow-sm h-full overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-bold text-on-surface">التصنيفات</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`w-full text-right px-3 py-2 rounded-lg text-sm font-bold transition-colors flex justify-between items-center ${
                selectedCategory === cat ? 'bg-primary/10 text-primary' : 'text-muted-gray hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              <span>{cat}</span>
              {cat !== 'الكل' && (
                <span className="bg-surface-container-low px-2 py-0.5 rounded text-xs">
                  {products.filter(p => p.category === cat).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-border bg-surface-container-low">
          {isAddingCategory ? (
            <form onSubmit={handleAddCategory} className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <input
                type="text"
                autoFocus
                placeholder="اسم التصنيف..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmittingCategory || !newCategoryName.trim()}
                  className="flex-1 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {isSubmittingCategory ? 'جاري...' : 'حفظ'}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAddingCategory(false); setNewCategoryName(''); }}
                  className="flex-1 py-1.5 bg-surface border border-border text-xs font-bold rounded-lg hover:bg-surface-container-low transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingCategory(true)}
              className="w-full py-2 flex justify-center items-center gap-1 text-primary text-sm font-bold hover:bg-primary/10 rounded-lg transition-colors border border-dashed border-primary/30"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              إضافة تصنيف
            </button>
          )}
        </div>
      </div>

      {/* Right Panel - Products */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-muted-gray">search</span>
            <input
              type="text"
              placeholder="ابحث عن منتج..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          <button 
            onClick={handleOpenAdd}
            className="w-full sm:w-auto bg-primary text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined">add</span>
            إضافة منتج
          </button>
        </div>

        {/* Mobile Categories Dropdown */}
        <div className="md:hidden mb-4">
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-on-surface outline-none"
          >
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-gray">جاري التحميل...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-muted-gray bg-surface border border-border rounded-xl">لا توجد منتجات</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto custom-scrollbar pb-6">
            {filteredProducts.map(p => (
              <div key={p.id} className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group relative">
                <div className="aspect-[4/3] bg-surface-container relative">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-gray">
                      <span className="material-symbols-outlined text-4xl opacity-50">fastfood</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-surface/90 backdrop-blur rounded-lg px-2 py-1 text-xs font-bold text-on-surface shadow-sm">
                    {p.category || 'بدون تصنيف'}
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="font-bold text-on-surface mb-1 truncate">{p.name}</h3>
                  <div className="flex justify-between items-center mt-3">
                    <span className="font-bold text-primary text-lg">{Number(p.price).toFixed(2)} ش</span>
                    
                    <button 
                      onClick={() => handleToggleAvailable(p)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                        p.isAvailable ? 'bg-success/10 text-success' : 'bg-muted-gray/10 text-muted-gray'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-current"></span>
                      {p.isAvailable ? 'متاح' : 'غير متاح'}
                    </button>
                  </div>
                </div>

                {/* Actions Overlay */}
                <div className="absolute inset-0 bg-on-surface/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button onClick={() => handleOpenEdit(p)} className="w-10 h-10 rounded-full bg-white text-primary shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="w-10 h-10 rounded-full bg-white text-error shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Side Panel Overlay */}
      {isPanelOpen && (
        <div className="fixed inset-0 bg-on-surface/50 z-50 flex justify-end">
          <div className="w-full max-w-md bg-surface h-full shadow-2xl flex flex-col border-l border-border animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-border flex justify-between items-center bg-surface-container-low">
              <h2 className="text-xl font-bold text-on-surface">
                {editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}
              </h2>
              <button onClick={() => setIsPanelOpen(false)} className="text-muted-gray hover:text-error transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
              <div className="space-y-2">
                <label className="text-sm font-bold text-on-surface">صورة المنتج</label>
                <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:bg-surface-container-low transition-colors cursor-pointer relative overflow-hidden">
                  {formData.imageUrl ? (
                    <img src={formData.imageUrl} alt="Preview" className="w-full h-32 object-contain" />
                  ) : (
                    <div className="py-6 flex flex-col items-center gap-2 text-muted-gray">
                      <span className="material-symbols-outlined text-3xl">image</span>
                      <span className="text-sm">اضغط لرفع صورة</span>
                    </div>
                  )}
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleImageUpload} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-on-surface">اسم المنتج *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-surface-container-low border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-on-surface">الوصف</label>
                <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2.5 bg-surface-container-low border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none custom-scrollbar" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-on-surface">السعر *</label>
                  <input required type="number" step="0.01" dir="ltr" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-4 py-2.5 bg-surface-container-low border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-on-surface">التصنيف</label>
                  <input type="text" list="categories" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2.5 bg-surface-container-low border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none" />
                  <datalist id="categories">
                    {categories.filter(c => c !== 'الكل').map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
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
  );
}
