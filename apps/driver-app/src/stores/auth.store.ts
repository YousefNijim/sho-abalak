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
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  login: (dto: LoginDto) => Promise<void>;
  register: (dto: RegisterDto) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,

      login: async (dto) => {
        const res = await authApi.login(dto);
        setAuthToken(res.access_token);
        set({ user: res.user as AuthUser, token: res.access_token });
      },

      register: async (dto) => {
        const res = await authApi.register(dto);
        setAuthToken(res.access_token);
        set({ user: res.user as AuthUser, token: res.access_token });
      },

      logout: () => {
        setAuthToken(null);
        set({ user: null, token: null });
      },

      hydrate: () => {
        const { token } = get();
        if (token) setAuthToken(token);
      },
    }),
    {
      name: 'shu-driver-auth',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
