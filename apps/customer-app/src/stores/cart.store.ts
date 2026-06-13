import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  variantId?: string | null;
  variantName?: string | null;
  imageUrl?: string | null;
}

// Unique key per cart line: same product + different variant = different line
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

interface CartState {
  businessId: string | null;
  businessType: 'FOOD' | 'STORE' | null;
  areaId: string | null;
  items: CartItem[];
  appliedCoupon: AppliedCoupon | null;
  addItem: (
    item: Omit<CartItem, 'quantity'>,
    businessId: string,
    areaId: string,
    businessType?: 'FOOD' | 'STORE',
  ) => 'added' | 'different_business' | 'different_type';
  removeItem: (productId: string, variantId?: string | null) => void;
  updateQty: (productId: string, delta: number, variantId?: string | null) => void;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
  clear: () => void;
  total: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      businessId: null,
      businessType: null,
      areaId: null,
      items: [],
      appliedCoupon: null,

      addItem: (item, businessId, areaId, businessType = 'FOOD') => {
        const { businessId: currentBiz, businessType: currentType, items } = get();
        
        if (currentType && currentType !== businessType) {
          return 'different_type';
        }
        
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
            businessType,
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

      clear: () => set({ businessId: null, businessType: null, areaId: null, items: [], appliedCoupon: null }),

      total: () => {
        const sum = get().items.reduce((s, i) => s + (Number(i.price) * Number(i.quantity)), 0);
        return Math.round(sum * 100) / 100;
      },
    }),
    {
      name: 'shu-customer-cart',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state: CartState) => ({ items: state.items, businessId: state.businessId, businessType: state.businessType, appliedCoupon: state.appliedCoupon }),
    },
  ),
);
