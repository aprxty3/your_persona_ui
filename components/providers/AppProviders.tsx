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
    void api.bootstrapSession().then(() => syncFromSession());
  }, [syncFromSession]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
