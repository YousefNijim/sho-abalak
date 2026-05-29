import axios from 'axios';

/** Base URL — override with NEXT_PUBLIC_API_URL or EXPO_PUBLIC_API_URL at build time */
export const BASE_URL =
  (typeof process !== 'undefined' &&
    (process.env['NEXT_PUBLIC_API_URL'] ?? process.env['EXPO_PUBLIC_API_URL'])) ||
  'http://127.0.0.1:3001';

export const http = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

/** Call this once on app init / after login to attach the bearer token. */
export function setAuthToken(token: string | null) {
  if (token) {
    http.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete http.defaults.headers.common['Authorization'];
  }
}
