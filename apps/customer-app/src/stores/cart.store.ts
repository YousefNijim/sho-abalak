import { create } from 'zustand';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  businessId: string | null;
  areaId: string | null;
  items: CartItem[];
  addItem: (
    item: Omit<CartItem, 'quantity'>,
    businessId: string,
    areaId: string,
  ) => 'added' | 'different_business';
  removeItem: (productId: string) => void;
  updateQty: (productId: string, delta: number) => void;
  clear: () => void;
  total: () => number;
}

export const useCartStore = create<CartState>()((set, get) => ({
  businessId: null,
  areaId: null,
  items: [],

  addItem: (item, businessId, areaId) => {
    const { businessId: currentBiz, items } = get();
    // Cart must belong to one business
    if (currentBiz && currentBiz !== businessId) {
      return 'different_business';
    }
    const existing = items.find((i) => i.productId === item.productId);
    if (existing) {
      set({
        items: items.map((i) =>
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        ),
      });
    } else {
      set({
        businessId,
        areaId,
        items: [...items, { ...item, quantity: 1 }],
      });
    }
    return 'added';
  },

  removeItem: (productId) =>
    set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),

  updateQty: (productId, delta) =>
    set((s) => ({
      items: s.items
        .map((i) =>
          i.productId === productId
            ? { ...i, quantity: Math.max(0, i.quantity + delta) }
            : i,
        )
        .filter((i) => i.quantity > 0),
    })),

  clear: () => set({ businessId: null, areaId: null, items: [] }),

  total: () => get().items.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0),
}));
