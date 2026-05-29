import { TableCard, StatusDot, RowActions } from '@/components/data-table';

const DRIVERS = [
  { name: 'كريم عبد الله', phone: '0599-777-001', area: 'رام الله', completed: 312, rating: '4.9', active: true },
  { name: 'يوسف نجار', phone: '0568-440-220', area: 'نابلس', completed: 198, rating: '4.6', active: true },
  { name: 'أحمد سمير', phone: '0597-310-555', area: 'الخليل', completed: 87, rating: '4.1', active: false },
];

export default function DriversPage() {
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-on-surface">إدارة السائقين</h2>
        <button className="flex h-12 items-center gap-gap-sm rounded-xl bg-primary px-6 text-white shadow-md transition-all hover:brightness-95 active:scale-95">
          <span className="material-symbols-outlined">add</span>
          <span className="font-bold">إضافة سائق</span>
        </button>
      </div>

      <TableCard
        headers={[
          { label: 'اسم السائق' },
          { label: 'رقم الهاتف' },
          { label: 'المنطقة' },
          { label: 'الطلبات المكتملة', align: 'center' },
          { label: 'التقييم', align: 'center' },
          { label: 'الحالة' },
          { label: 'إجراءات', align: 'left' },
        ]}
      >
        {DRIVERS.map((d) => (
          <tr key={d.phone} className="group transition-colors hover:bg-background/30">
            <td className="px-6 py-4">
              <div className="flex items-center gap-gap-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/15 text-xs text-secondary">
                  {d.name.charAt(0)}
                </div>
                <span>{d.name}</span>
              </div>
            </td>
            <td className="px-6 py-4" dir="ltr">{d.phone}</td>
            <td className="px-6 py-4">{d.area}</td>
            <td className="px-6 py-4 text-center font-bold">{d.completed}</td>
            <td className="px-6 py-4">
              <div className="flex items-center justify-center gap-1 text-warning-amber">
                <span className="material-symbols-outlined text-[18px]">star</span>
                <span className="text-[14px] font-bold">{d.rating}</span>
              </div>
            </td>
            <td className="px-6 py-4">
              <StatusDot active={d.active} on="متاح" off="غير متاح" />
            </td>
            <td className="px-6 py-4">
              <RowActions />
            </td>
          </tr>
        ))}
      </TableCard>
    </>
  );
}
