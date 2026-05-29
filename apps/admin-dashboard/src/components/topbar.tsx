export function TopBar() {
  return (
    <header className="sticky top-0 z-40 flex h-nav-height items-center justify-between bg-surface px-margin-standard shadow-sm">
      <h1 className="text-xl font-semibold text-primary">لوحة الإدارة</h1>
      <div className="flex items-center gap-gap-lg">
        <button className="material-symbols-outlined text-muted-gray transition-colors hover:text-primary">
          notifications
        </button>
        <div className="flex items-center gap-gap-sm">
          <div className="text-left">
            <p className="text-[13px] font-medium leading-none">أحمد المحمود</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-gray">مدير النظام</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/20 bg-primary-fixed font-bold text-primary">
            أ
          </div>
        </div>
      </div>
    </header>
  );
}
