export interface NavItem {
  href: string;
  label: string;
  icon: string; // Material Symbols name
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'لوحة التحكم', icon: 'dashboard' },
  { href: '/orders', label: 'الطلبات', icon: 'local_shipping' },
  { href: '/businesses', label: 'المتاجر', icon: 'storefront' },
  { href: '/inventory', label: 'المخزون', icon: 'inventory_2' },
  { href: '/users', label: 'المستخدمين', icon: 'group' },
  { href: '/drivers', label: 'السائقين', icon: 'delivery_dining' },
  { href: '/areas', label: 'المناطق', icon: 'explore' },
  { href: '/reviews', label: 'المراجعات', icon: 'rate_review' },
  { href: '/reports', label: 'التقارير', icon: 'analytics' },
  { href: '/offers', label: 'العروض والكوبونات', icon: 'local_offer' },
  { href: '/banners', label: 'الإعلانات الرئيسية', icon: 'view_carousel' },
  { href: '/popup-ads', label: 'الإعلانات المنبثقة', icon: 'picture_in_picture' },
  { href: '/promoted-businesses', label: 'المنشآت المميزة', icon: 'hotel_class' },
  { href: '/tags', label: 'الأقسام', icon: 'category' },
  { href: '/settings', label: 'الإعدادات', icon: 'settings' },
];
