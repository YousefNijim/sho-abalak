export interface NavItem {
  href: string;
  label: string;
  icon: string; // Material Symbols name
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'عام',
    items: [
      { href: '/', label: 'لوحة التحكم', icon: 'dashboard' },
      { href: '/orders', label: 'الطلبات', icon: 'local_shipping' },
      { href: '/reports', label: 'التقارير', icon: 'analytics' },
    ],
  },
  {
    title: 'المطاعم (FOOD)',
    items: [
      { href: '/businesses?type=FOOD', label: 'إدارة المطاعم', icon: 'restaurant' },
      { href: '/tags?type=FOOD', label: 'تصنيفات المطاعم', icon: 'category' },
    ],
  },
  {
    title: 'المتاجر (STORE)',
    items: [
      { href: '/businesses?type=STORE', label: 'إدارة المتاجر', icon: 'storefront' },
      { href: '/tags?type=STORE', label: 'أقسام المتاجر', icon: 'category' },
      { href: '/category-groups', label: 'مجموعات التصنيفات', icon: 'folder_open' },
      { href: '/inventory', label: 'مخزون المتاجر', icon: 'inventory_2' },
    ],
  },
  {
    title: 'الإعلانات والعروض',
    items: [
      { href: '/offers', label: 'العروض والكوبونات', icon: 'local_offer' },
      { href: '/banners', label: 'الإعلانات الرئيسية', icon: 'view_carousel' },
      { href: '/popup-ads', label: 'الإعلانات المنبثقة', icon: 'picture_in_picture' },
      { href: '/promoted-businesses', label: 'المنشآت المميزة', icon: 'hotel_class' },
    ],
  },
  {
    title: 'الإعدادات والمستخدمين',
    items: [
      { href: '/users', label: 'المستخدمين', icon: 'group' },
      { href: '/drivers', label: 'السائقين', icon: 'delivery_dining' },
      { href: '/areas', label: 'المناطق', icon: 'explore' },
      { href: '/reviews', label: 'المراجعات', icon: 'rate_review' },
      { href: '/settings', label: 'الإعدادات', icon: 'settings' },
    ],
  },
];
