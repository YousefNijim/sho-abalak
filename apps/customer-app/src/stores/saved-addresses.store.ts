import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedAddress {
  id: string;
  label: string;
  detail: string;
  areaId: string | null;
}

interface SavedAddressesState {
  addresses: SavedAddress[];
  selectedId: string | null;
  add: (address: Omit<SavedAddress, 'id'>) => void;
  remove: (id: string) => void;
  select: (id: string | null) => void;
}

export const useSavedAddressesStore = create<SavedAddressesState>()(
  persist(
    (set) => ({
      addresses: [],
      selectedId: null,
      add: (address) =>
        set((s) => ({
          addresses: [
            ...s.addresses,
            { ...address, id: Date.now().toString() },
          ],
        })),
      remove: (id) =>
        set((s) => ({
          addresses: s.addresses.filter((a) => a.id !== id),
          selectedId: s.selectedId === id ? null : s.selectedId,
        })),
      select: (id) => set({ selectedId: id }),
    }),
    { name: 'shu-saved-addresses', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
