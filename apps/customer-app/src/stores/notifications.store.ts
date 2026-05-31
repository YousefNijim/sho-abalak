import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  receivedAt: number;
  read: boolean;
}

interface NotificationsState {
  items: AppNotification[];
  add: (n: Omit<AppNotification, 'id' | 'receivedAt' | 'read'>) => void;
  markAllRead: () => void;
  clear: () => void;
  unreadCount: () => number;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (n) =>
        set((s) => ({
          items: [
            {
              ...n,
              id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
              receivedAt: Date.now(),
              read: false,
            },
            ...s.items,
          ].slice(0, 100),
        })),
      markAllRead: () => set((s) => ({ items: s.items.map((i) => ({ ...i, read: true })) })),
      clear: () => set({ items: [] }),
      unreadCount: () => get().items.filter((i) => !i.read).length,
    }),
    {
      name: 'shu-customer-notifications',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
