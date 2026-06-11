'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { NAV_GROUPS } from './nav-items';

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <aside className="fixed inset-y-0 right-0 z-50 hidden w-64 transform bg-secondary text-white transition-transform duration-300 md:translate-x-0 md:flex md:flex-col">
      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
        <h2 className="mb-6 text-2xl font-bold text-white">شو عبالك؟</h2>
        <nav className="space-y-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="mb-3 px-4 text-[11px] font-bold text-white/50 tracking-wider">
                {group.title}
              </h3>
              <div className="space-y-1.5">
                {group.items.map((item) => {
                  // Basic path check
                  const pathBase = item.href.split('?')[0];
                  let active = item.href === '/' ? pathname === '/' : pathname.startsWith(pathBase);

                  // If the link has a search param (e.g. ?type=FOOD), we must match the param as well
                  if (active && item.href.includes('?')) {
                    const urlParams = new URLSearchParams(item.href.split('?')[1]);
                    const typeParam = urlParams.get('type');
                    if (typeParam) {
                      active = searchParams.get('type') === typeParam;
                    }
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-gap-md rounded-xl px-4 py-3 text-[13px] font-medium transition-all duration-200 ${
                        active ? 'bg-primary text-white shadow-md' : 'hover:bg-white/10 text-white/80'
                      }`}
                    >
                      <span className="material-symbols-outlined">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
      `}</style>
    </aside>
  );
}
