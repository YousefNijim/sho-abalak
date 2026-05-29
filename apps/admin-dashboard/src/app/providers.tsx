'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getQueryClient } from '@/lib/query-client';
import { setAuthToken } from '@shu/api-client';
import { getToken } from '@/lib/auth';

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  // Attach saved JWT to every axios request on mount
  useEffect(() => {
    const token = getToken();
    if (token) setAuthToken(token);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
