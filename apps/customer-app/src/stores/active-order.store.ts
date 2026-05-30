import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ActiveOrder {
  id: string;
  businessName: string;
  status: string;
  total: number;
}

interface ActiveOrderState {
  order: ActiveOrder | null;
  set: (order: ActiveOrder | null) => void;
  clear: () => void;
}

export const useActiveOrderStore = create<ActiveOrderState>()(
  persist(
    (set) => ({
      order: null,
      set: (order) => set({ order }),
      clear: () => set({ order: null }),
    }),
    {
      name: 'shu-active-order',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
