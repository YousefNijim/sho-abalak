import axios from 'axios';

/** Base URL — override with NEXT_PUBLIC_API_URL or EXPO_PUBLIC_API_URL at build time */
export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL || 'https://shu-abalak-production.up.railway.app';

export const http = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true'
  },
});

// Module-level token reference. The request interceptor reads this on every
// request, so even if a query fires before setAuthToken runs, as long as the
// token is set by the time the request goes out, the header is attached.
let currentToken: string | null = null;

/** Call this once on app init / after login to attach the bearer token. */
export function setAuthToken(token: string | null) {
  currentToken = token;
  if (token) {
    http.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete http.defaults.headers.common['Authorization'];
  }
}

// Always attach the latest token at request time (covers the hydration race on
// web view / cold start where the header default may not be set yet).
http.interceptors.request.use((config) => {
  if (currentToken) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${currentToken}`;
  }
  return config;
});
