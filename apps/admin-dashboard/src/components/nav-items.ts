export interface NavItem {
  href: string;
  label: string;
  icon: string; // Material Symbols name
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'لوحة التحكم', icon: 'dashboard' },
  { href: '/orders', label: 'الطلبات', icon: 'local_shipping' },
  { href: '/businesses', label: 'المتاجر', icon: 'storefront' },
  { href: '/users', label: 'المستخدمين', icon: 'group' },
  { href: '/reports', label: 'التقارير', icon: 'analytics' },
  { href: '/settings', label: 'الإعدادات', icon: 'settings' },
];
