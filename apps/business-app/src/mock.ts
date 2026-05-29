export interface BizOrder {
  id: string;
  customer: string;
  items: number;
  total: number;
  time: string;
  stage: 'new' | 'active' | 'done';
}

export const ORDERS: BizOrder[] = [
  { id: '1234', customer: 'سامي علي', items: 3, total: 85, time: 'منذ دقيقتين', stage: 'new' },
  { id: '1233', customer: 'نور حسين', items: 2, total: 42, time: 'منذ 8 دقائق', stage: 'new' },
  { id: '1230', customer: 'مريم يوسف', items: 4, total: 120, time: 'منذ 20 دقيقة', stage: 'active' },
  { id: '1228', customer: 'خالد إبراهيم', items: 1, total: 25, time: 'منذ ساعة', stage: 'done' },
];

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  available: boolean;
}

export const MENU: MenuItem[] = [
  { id: 'm1', name: 'شاورما دجاج', price: 18, category: 'وجبات', available: true },
  { id: 'm2', name: 'شاورما لحمة', price: 25, category: 'وجبات', available: true },
  { id: 'm3', name: 'عصير برتقال', price: 8, category: 'مشروبات', available: false },
];

export const DRIVERS = [
  { id: 'd1', name: 'كريم عبد الله', area: 'رام الله - المصيون', deliveries: 312, rating: 4.9, available: true },
  { id: 'd2', name: 'يوسف نجار', area: 'رام الله - البيرة', deliveries: 198, rating: 4.6, available: true },
];
