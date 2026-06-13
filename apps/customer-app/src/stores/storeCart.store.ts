import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StoreCartItem {
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

interface StoreCartState {
  businessId: string | null;
  areaId: string | null;
  items: StoreCartItem[];
  appliedCoupon: AppliedCoupon | null;
  addItem: (
    item: Omit<StoreCartItem, 'quantity'>,
    businessId: string,
    areaId: string,
  ) => 'added' | 'different_business';
  removeItem: (productId: string, variantId?: string | null) => void;
  updateQty: (productId: string, delta: number, variantId?: string | null) => void;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
  clear: () => void;
  total: () => number;
}

export const useStoreCartStore = create<StoreCartState>()(
  persist(
    (set, get) => ({
      businessId: null,
      areaId: null,
      items: [],
      appliedCoupon: null,

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

      clear: () => set({ businessId: null, areaId: null, items: [], appliedCoupon: null }),

      total: () => {
        const sum = get().items.reduce((s, i) => s + (Number(i.price) * Number(i.quantity)), 0);
        return Math.round(sum * 100) / 100;
      },
    }),
    {
      name: 'store-cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state: StoreCartState) => ({ 
        items: state.items, 
        businessId: state.businessId, 
        appliedCoupon: state.appliedCoupon 
      }),
    },
  ),
);
