'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getQueryClient } from '@/lib/query-client';
import { http, setAuthToken } from '@shu/api-client';
import { getToken } from '@/lib/auth';

// Read the JWT from localStorage on EVERY request. Client-side navigation does
// not remount Providers, and a one-time setAuthToken can miss the post-login
// token — an interceptor that reads fresh each time is timing-proof. Guarded so
// React Strict Mode's double-mount can't register it twice.
let interceptorRegistered = false;
function registerAuthInterceptor() {
  if (interceptorRegistered) return;
  interceptorRegistered = true;
  http.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  // Attach saved JWT to axios immediately + on every future request.
  useEffect(() => {
    const token = getToken();
    if (token) setAuthToken(token);
    registerAuthInterceptor();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
