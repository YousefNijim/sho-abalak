import Cookies from 'js-cookie';
import { setAuthToken } from '@shu/api-client';

const TOKEN_KEY = 'business_portal_token';

export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
    Cookies.set(TOKEN_KEY, token, { expires: 30, path: '/' });
    setAuthToken(token);
  }
}

export function removeToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    Cookies.remove(TOKEN_KEY, { path: '/' });
    setAuthToken(null);
  }
}
