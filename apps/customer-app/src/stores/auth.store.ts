import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, setAuthToken } from '@shu/api-client';
import type { LoginDto, RegisterDto } from '@shu/api-client';

interface AuthUser {
  id: string;
  name: string;
  phone: string;
  role: string;
  status: string;
  areaId: string | null;
  email?: string | null;
  imageUrl?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  login: (dto: LoginDto) => Promise<void>;
  register: (dto: RegisterDto) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
  /** Refresh the cached profile from /auth/me (e.g. after editing it). */
  refreshUser: () => Promise<void>;
  /** Merge fresh profile fields into the cached user. */
  setUser: (user: AuthUser) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,

      login: async (dto) => {
        const res = await authApi.login(dto);
        if (res.user.role !== 'CUSTOMER' && res.user.role !== 'BUSINESS') {
          throw new Error('هذا الحساب غير مصرّح له بالدخول لتطبيق الزبائن. يرجى استخدام تطبيق الكابتن أو تطبيق التاجر.');
        }
        setAuthToken(res.accessToken);
        set({ user: res.user as AuthUser, token: res.accessToken });
      },

      register: async (dto) => {
        const res = await authApi.register(dto);
        setAuthToken(res.accessToken);
        set({ user: res.user as AuthUser, token: res.accessToken });
      },

      logout: () => {
        setAuthToken(null);
        set({ user: null, token: null });
      },

      hydrate: () => {
        const { token } = get();
        if (token) setAuthToken(token);
      },

      refreshUser: async () => {
        if (!get().token) return;
        const me = await authApi.me();
        set({ user: me as AuthUser });
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'shu-customer-auth',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
