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
  add: (n: Omit<AppNotification, 'id' | 'receivedAt' | 'read'> & { id?: string }) => void;
  markAllRead: () => void;
  clear: () => void;
  unreadCount: () => number;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      items: [],
      add: ({ id, ...n }) =>
        set((s) => {
          // Dedupe: a notification can be reported by both the foreground listener
          // and the tap/cold-start handler. Skip if we already have this id, or an
          // identical title+body within the last 10s.
          if (id && s.items.some((i) => i.id === id)) return s;
          const now = Date.now();
          if (s.items.some((i) => i.title === n.title && i.body === n.body && now - i.receivedAt < 10_000)) {
            return s;
          }
          return {
            items: [
              {
                ...n,
                id: id ?? `${now}-${Math.round(Math.random() * 1e6)}`,
                receivedAt: now,
                read: false,
              },
              ...s.items,
            ].slice(0, 100),
          };
        }),
      markAllRead: () => set((s) => ({ items: s.items.map((i) => ({ ...i, read: true })) })),
      clear: () => set({ items: [] }),
      unreadCount: () => get().items.filter((i) => !i.read).length,
    }),
    {
      name: 'shu-driver-notifications',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
