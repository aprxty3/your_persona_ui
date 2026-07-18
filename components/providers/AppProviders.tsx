'use client';

import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '@/core/infrastructure/apiClient';
import { initAnalytics } from '@/core/infrastructure/analytics';
import { useAuthStore } from '@/core/application/stores/authStore';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 30_000 },
        },
      }),
  );

  const syncFromSession = useAuthStore((s) => s.syncFromSession);

  useEffect(() => {
    initAnalytics();
    // Boot refresh (§5.1): a new tab with a persisted refresh_token → fill
    // the access token into memory in the background, then sync the store.
    void api.bootstrapSession().then(() => syncFromSession());
  }, [syncFromSession]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
