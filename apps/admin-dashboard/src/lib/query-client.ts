'use client';

import { QueryClient } from '@tanstack/react-query';

// Singleton so all client components share one cache
let client: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (!client) {
    client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,       // 30 s
          retry: 1,
          refetchOnWindowFocus: false,
        },
      },
    });
  }
  return client;
}
