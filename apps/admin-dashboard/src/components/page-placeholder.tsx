export function PagePlaceholder({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-gap-md rounded-xl border border-border-beige bg-surface-white p-section-lg text-center shadow-sm">
      <span className="material-symbols-outlined text-6xl text-border-beige">{icon}</span>
      <h2 className="text-2xl font-bold text-on-surface">{title}</h2>
      <p className="text-[15px] text-muted-gray">هذه الصفحة قيد الإنشاء</p>
    </div>
  );
}
