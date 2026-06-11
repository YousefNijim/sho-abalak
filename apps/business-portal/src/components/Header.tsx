'use client';

import { useBusiness } from './BusinessProvider';
import { removeToken } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  const { business } = useBusiness();
  const router = useRouter();

  const handleLogout = () => {
    removeToken();
    router.push('/login');
  };

  return (
    <header className="h-nav-height bg-surface border-b border-border flex items-center justify-between px-4 md:px-6 shrink-0 shadow-sm z-30">
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="md:hidden flex items-center justify-center p-2 rounded-xl text-muted-gray hover:bg-surface-container">
          <span className="material-symbols-outlined">menu</span>
        </button>
        <h1 className="text-lg md:text-xl font-bold text-on-surface">بوابة الإدارة</h1>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-muted-gray hover:text-primary transition-colors">
          <span className="material-symbols-outlined">notifications</span>
          {/* Badge for notifications */}
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-error rounded-full"></span>
        </button>
        
        <div className="flex items-center gap-3 pr-4 border-r border-border">
          <div className="hidden md:flex flex-col text-left items-end">
            <span className="text-sm font-bold text-on-surface">{business?.name || '...'}</span>
            <span className="text-[10px] text-muted-gray">{business?.owner?.name || ''}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-surface-container overflow-hidden flex items-center justify-center text-primary font-bold">
            {business?.imageUrl ? (
              <img src={business.imageUrl} alt={business.name} className="w-full h-full object-cover" />
            ) : (
              business?.name?.charAt(0) || 'ش'
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
