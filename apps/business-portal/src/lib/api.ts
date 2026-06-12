import { http, setAuthToken } from '@shu/api-client';
import { removeToken, getToken } from './auth';

if (typeof window !== 'undefined') {
  // Restore token on application initialization (cold start / page reload)
  const token = getToken();
  if (token) {
    setAuthToken(token);
  }

  http.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        removeToken();
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );
}
