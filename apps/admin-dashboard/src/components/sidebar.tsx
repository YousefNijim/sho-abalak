'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from './nav-items';

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 right-0 z-50 hidden w-64 transform bg-secondary text-white transition-transform duration-300 md:translate-x-0 md:block">
      <div className="p-6">
        <h2 className="mb-8 text-2xl font-bold text-white">شو عبالك؟</h2>
        <nav className="space-y-4">
          {NAV_ITEMS.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-gap-md rounded-xl px-4 py-3 text-[13px] font-medium transition-all duration-200 ${
                  active ? 'bg-primary text-white' : 'hover:bg-white/10'
                }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
