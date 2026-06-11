'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useBusiness } from './BusinessProvider';
import { businessesApi } from '@shu/api-client';
import { removeToken } from '@/lib/auth';

export function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (o: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { business, isFood, isStore, refetch } = useBusiness();

  const handleToggleOpen = async () => {
    if (!business) return;
    try {
      await businessesApi.adminUpdateStatus(business.id, !business.isOpen);
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const navItems = [
    { title: 'الرئيسية', items: [
      { href: '/', label: 'لوحة التحكم', icon: 'dashboard' },
      { href: '/orders', label: 'الطلبات', icon: 'local_shipping' },
      { href: '/profile', label: 'ملف المنشأة', icon: 'storefront' },
    ]},
    ...(isFood ? [{
      title: 'المطعم', items: [
        { href: '/menu', label: 'القائمة', icon: 'restaurant_menu' },
      ]
    }] : []),
    ...(isStore ? [{
      title: 'المتجر', items: [
        { href: '/products', label: 'المنتجات', icon: 'inventory_2' },
      ]
    }] : []),
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-on-surface/50 z-40 md:hidden" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 right-0 z-50 w-64 transform bg-surface shadow-xl border-l border-border transition-transform duration-300 flex flex-col ${
        isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
      } md:static`}>
        
        {/* Branding & Business Info */}
        <div className="p-6 border-b border-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-primary">شو عبالك؟</h2>
            <button className="md:hidden text-muted-gray" onClick={() => setIsOpen(false)}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          
          <div className="bg-surface-container-low p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-surface-container overflow-hidden flex items-center justify-center text-primary font-bold shadow-sm">
                {business?.imageUrl ? (
                  <img src={business.imageUrl} alt={business.name} className="w-full h-full object-cover" />
                ) : (
                  business?.name?.charAt(0) || 'ش'
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm text-on-surface line-clamp-1">{business?.name || '...'}</h3>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold mt-1 ${
                  isFood ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {isFood ? '🍽️ مطعم' : '🏪 متجر'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-xs font-medium text-muted-gray">حالة العمل</span>
              <button 
                onClick={handleToggleOpen}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  business?.isOpen ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-current"></span>
                {business?.isOpen ? 'مفتوح' : 'مغلق'}
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <nav className="space-y-6">
            {navItems.map(group => (
              <div key={group.title}>
                <h3 className="mb-2 px-2 text-[11px] font-bold text-muted-gray tracking-wider">
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {group.items.map(item => {
                    const isActive = pathname === item.href;
                    return (
                      <Link 
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                          isActive 
                            ? 'bg-primary/10 text-primary border-r-4 border-primary' 
                            : 'text-on-surface/70 hover:bg-surface-container hover:text-on-surface border-r-4 border-transparent'
                        }`}
                      >
                        <span className="material-symbols-outlined">{item.icon}</span>
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border mt-auto">
          <button 
            onClick={() => {
              removeToken();
              router.push('/login');
            }}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-error hover:bg-error/10 rounded-xl text-sm font-bold transition-colors"
          >
            <span className="material-symbols-outlined">logout</span>
            تسجيل الخروج
          </button>
          <div className="text-center mt-4">
            <span className="text-[10px] text-muted-gray">v1.0.0 Business Portal</span>
          </div>
        </div>
      </aside>
    </>
  );
}
