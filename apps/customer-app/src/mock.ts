export interface MockBusiness {
  id: string;
  name: string;
  desc: string;
  rating: number;
  time: string;
  fee: string;
  open: boolean;
  emoji: string;
}

export const CATEGORIES = [
  { label: 'مطاعم', emoji: '🍕' },
  { label: 'محلات', emoji: '🛒' },
  { label: 'كافيه', emoji: '☕' },
  { label: 'خضار', emoji: '🍎' },
  { label: 'ملحمة', emoji: '🥩' },
];

export const BUSINESSES: MockBusiness[] = [
  { id: '1', name: 'مطعم القدس', desc: 'شاورما، مشاوي، وجبات سريعة', rating: 4.8, time: '25-35 دقيقة', fee: '3 شيكل', open: true, emoji: '🥙' },
  { id: '2', name: 'حمص البركة', desc: 'حمص، فلافل، فطور شرقي', rating: 4.9, time: '15-20 دقيقة', fee: '2 شيكل', open: true, emoji: '🧆' },
  { id: '3', name: 'حلويات النصر', desc: 'حلويات عربية، كنافة، بوظة', rating: 4.7, time: '30-40 دقيقة', fee: '4 شيكل', open: true, emoji: '🍰' },
  { id: '4', name: 'كافيه الصباح', desc: 'قهوة، مشروبات، حلى', rating: 4.4, time: '10-15 دقيقة', fee: '5 شيكل', open: false, emoji: '☕' },
];

export interface MockProduct {
  id: string;
  name: string;
  desc: string;
  price: number;
}

export const PRODUCTS: MockProduct[] = [
  { id: 'p1', name: 'شاورما دجاج', desc: 'صدر دجاج مشوي، خبز، صوص ثوم', price: 18 },
  { id: 'p2', name: 'شاورما لحمة', desc: 'لحمة طازجة، طحينة، مخللات', price: 25 },
  { id: 'p3', name: 'صحن حمص', desc: 'حمص بالطحينة وزيت الزيتون', price: 12 },
  { id: 'p4', name: 'عصير برتقال طازج', desc: 'برتقال طبيعي 100%', price: 8 },
];

export interface MockOrder {
  id: string;
  business: string;
  date: string;
  items: number;
  total: number;
  status: 'DELIVERED' | 'PREPARING' | 'CANCELLED' | 'PICKED_UP';
}

export const ORDERS: MockOrder[] = [
  { id: 'ORD-9421', business: 'مطعم القدس', date: '29 مايو، 14:05', items: 3, total: 85, status: 'PREPARING' },
  { id: 'ORD-9410', business: 'حمص البركة', date: '27 مايو، 09:20', items: 2, total: 34, status: 'DELIVERED' },
  { id: 'ORD-9388', business: 'حلويات النصر', date: '24 مايو، 18:45', items: 1, total: 45, status: 'CANCELLED' },
];
