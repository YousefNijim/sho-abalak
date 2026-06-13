import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FoodCartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  variantId?: string | null;
  variantName?: string | null;
  imageUrl?: string | null;
}

const lineKey = (productId: string, variantId?: string | null) =>
  variantId ? `${productId}__${variantId}` : productId;

export interface AppliedCoupon {
  code: string;
  discountAmount: number;
  discountType: 'FIXED' | 'PERCENTAGE';
  discountPct: number | null;
  maxDiscount: number | null;
  minimumOrder: number;
  issuedBy: 'PLATFORM' | 'BUSINESS';
}

interface FoodCartState {
  businessId: string | null;
  areaId: string | null;
  items: FoodCartItem[];
  appliedCoupon: AppliedCoupon | null;
  note: string;
  addItem: (
    item: Omit<FoodCartItem, 'quantity'>,
    businessId: string,
    areaId: string,
  ) => 'added' | 'different_business';
  removeItem: (productId: string, variantId?: string | null) => void;
  updateQty: (productId: string, delta: number, variantId?: string | null) => void;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
  setNote: (note: string) => void;
  clear: () => void;
  total: () => number;
}

export const useFoodCartStore = create<FoodCartState>()(
  persist(
    (set, get) => ({
      businessId: null,
      areaId: null,
      items: [],
      appliedCoupon: null,
      note: '',

      addItem: (item, businessId, areaId) => {
        const { businessId: currentBiz, items } = get();
        
        if (currentBiz && currentBiz !== businessId) {
          return 'different_business';
        }
        
        const key = lineKey(item.productId, item.variantId);
        const existing = items.find((i) => lineKey(i.productId, i.variantId) === key);
        
        if (existing) {
          set({
            items: items.map((i) =>
              lineKey(i.productId, i.variantId) === key
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

      removeItem: (productId, variantId) => {
        const key = lineKey(productId, variantId);
        set((s) => ({ items: s.items.filter((i) => lineKey(i.productId, i.variantId) !== key) }));
      },

      updateQty: (productId, delta, variantId) => {
        const key = lineKey(productId, variantId);
        set((s) => ({
          items: s.items
            .map((i) =>
              lineKey(i.productId, i.variantId) === key
                ? { ...i, quantity: Math.max(0, i.quantity + delta) }
                : i,
            )
            .filter((i) => i.quantity > 0),
        }));
      },

      setAppliedCoupon: (coupon) => set({ appliedCoupon: coupon }),
      setNote: (note) => set({ note }),

      clear: () => set({ businessId: null, areaId: null, items: [], appliedCoupon: null, note: '' }),

      total: () => {
        const sum = get().items.reduce((s, i) => s + (Number(i.price) * Number(i.quantity)), 0);
        return Math.round(sum * 100) / 100;
      },
    }),
    {
      name: 'food-cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state: FoodCartState) => ({ 
        items: state.items, 
        businessId: state.businessId, 
        appliedCoupon: state.appliedCoupon,
        note: state.note 
      }),
    },
  ),
);
