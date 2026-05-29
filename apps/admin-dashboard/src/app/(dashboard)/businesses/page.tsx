const BUSINESSES = [
  { id: '#M-10293', name: 'مطعم الزيتون الأصيل', category: 'مطاعم', cat: 'restaurant', area: 'رام الله', orders: '1,240', rating: '4.8', active: true },
  { id: '#S-22481', name: 'سوبر ماركت النجمة', category: 'محلات', cat: 'store', area: 'نابلس', orders: '856', rating: '4.5', active: true },
  { id: '#C-44912', name: 'كافيه الصباح', category: 'كافيه', cat: 'cafe', area: 'الخليل', orders: '512', rating: '4.2', active: false },
];

const CATEGORY_STYLE: Record<string, string> = {
  restaurant: 'bg-primary/10 text-primary',
  store: 'bg-tertiary/10 text-tertiary',
  cafe: 'bg-secondary-container/40 text-secondary',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="mr-2 block text-[13px] text-on-surface">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full h-12 px-4 bg-background/50 border-[1.5px] border-border-beige rounded-xl focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-[15px]';

export default function BusinessesPage() {
  return (
    <>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-on-surface">إدارة المنشآت</h2>
        <button className="flex h-12 items-center gap-gap-sm rounded-xl bg-primary px-6 text-white shadow-md transition-all hover:brightness-95 active:scale-95">
          <span className="material-symbols-outlined">add</span>
          <span className="font-bold">إضافة منشأة جديدة</span>
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-border-beige bg-surface-white p-6 shadow-sm">
        <div className="grid grid-cols-1 items-end gap-gap-md md:grid-cols-4 lg:grid-cols-5">
          <div className="space-y-2 lg:col-span-2">
            <label className="mr-2 block text-[13px] text-on-surface">البحث عن منشأة</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-muted-gray">
                search
              </span>
              <input className={`${inputCls} pr-12`} placeholder="اسم المنشأة، رقم الهاتف..." />
            </div>
          </div>
          <Field label="التصنيف">
            <select className={`${inputCls} cursor-pointer appearance-none`}>
              <option>الكل</option>
              <option>مطاعم</option>
              <option>محلات</option>
              <option>كافيه</option>
            </select>
          </Field>
          <Field label="المنطقة">
            <select className={`${inputCls} cursor-pointer appearance-none`}>
              <option>كل المدن</option>
              <option>رام الله</option>
              <option>نابلس</option>
              <option>الخليل</option>
            </select>
          </Field>
          <Field label="الحالة">
            <div className="flex h-12 rounded-xl border border-border-beige bg-background/50 p-1">
              <button className="flex-1 rounded-lg bg-surface-white text-[14px] font-bold text-primary shadow-sm">
                نشط
              </button>
              <button className="flex-1 rounded-lg text-[14px] text-muted-gray transition-colors hover:text-on-surface">
                غير نشط
              </button>
            </div>
          </Field>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border-beige bg-surface-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-right">
            <thead>
              <tr className="border-b border-border-beige bg-surface-container-low text-[14px] text-on-surface">
                <th className="px-6 py-4 font-semibold">المنشأة</th>
                <th className="px-6 py-4 font-semibold">التصنيف</th>
                <th className="px-6 py-4 font-semibold">المنطقة</th>
                <th className="px-6 py-4 text-center font-semibold">إجمالي الطلبات</th>
                <th className="px-6 py-4 text-center font-semibold">التقييم</th>
                <th className="px-6 py-4 font-semibold">الحالة</th>
                <th className="px-6 py-4 text-left font-semibold">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-beige">
              {BUSINESSES.map((b) => (
                <tr key={b.id} className="group transition-colors hover:bg-background/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-gap-md">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border-beige bg-background text-primary">
                        <span className="material-symbols-outlined">storefront</span>
                      </div>
                      <div>
                        <p className="text-[15px] font-semibold text-on-surface">{b.name}</p>
                        <p className="text-[11px] text-muted-gray">ID: {b.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-[12px] ${CATEGORY_STYLE[b.cat]}`}>
                      {b.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[15px]">{b.area}</td>
                  <td className="px-6 py-4 text-center font-bold">{b.orders}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1 text-warning-amber">
                      <span className="material-symbols-outlined text-[18px]">star</span>
                      <span className="text-[14px] font-bold">{b.rating}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${b.active ? 'bg-success' : 'bg-error'}`}
                      />
                      <span
                        className={`text-[13px] font-bold ${b.active ? 'text-success' : 'text-error'}`}
                      >
                        {b.active ? 'نشط' : 'غير نشط'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2 opacity-60 transition-opacity group-hover:opacity-100">
                      <button className="flex h-10 w-10 items-center justify-center rounded-lg text-primary hover:bg-surface-container">
                        <span className="material-symbols-outlined">visibility</span>
                      </button>
                      <button className="flex h-10 w-10 items-center justify-center rounded-lg text-secondary hover:bg-surface-container">
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      <button className="flex h-10 w-10 items-center justify-center rounded-lg text-error hover:bg-error/10">
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border-beige bg-surface-container-lowest px-6 py-4">
          <p className="text-[13px] text-muted-gray">عرض 1-10 من أصل 45 منشأة</p>
          <div className="flex items-center gap-gap-sm">
            <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-beige text-on-surface hover:bg-surface-container">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
            <button className="h-10 w-10 rounded-lg bg-primary font-bold text-white">1</button>
            <button className="h-10 w-10 rounded-lg text-on-surface hover:bg-surface-container">2</button>
            <button className="h-10 w-10 rounded-lg text-on-surface hover:bg-surface-container">3</button>
            <span className="px-2 text-muted-gray">...</span>
            <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-beige text-on-surface hover:bg-surface-container">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
