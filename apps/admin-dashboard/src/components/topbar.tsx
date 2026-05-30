'use client';

import { clearToken } from '@/lib/auth';

export function TopBar() {
  const handleLogout = () => {
    clearToken();
    window.location.href = '/login';
  };

  return (
    <header className="sticky top-0 z-40 flex h-nav-height items-center justify-between bg-surface px-margin-standard shadow-sm">
      <h1 className="text-xl font-semibold text-primary">لوحة الإدارة</h1>
      <div className="flex items-center gap-gap-lg">
        {/* Notifications placeholder */}
        <button className="material-symbols-outlined text-muted-gray transition-colors hover:text-primary">
          notifications
        </button>

        {/* Admin profile detail */}
        <div className="flex items-center gap-gap-sm">
          <div className="text-left">
            <p className="text-[13px] font-medium leading-none">المشرف الإداري</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-gray">مدير النظام</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10 font-bold text-primary">
            م
          </div>
        </div>

        {/* Functional Logout Button */}
        <button
          onClick={handleLogout}
          className="flex h-10 items-center gap-2 rounded-xl border border-error/20 bg-error/5 px-4 text-[13px] font-bold text-error transition-all hover:bg-error hover:text-white"
          dir="rtl"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          تسجيل الخروج
        </button>
      </div>
    </header>
  );
}
