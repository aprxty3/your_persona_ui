'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/core/infrastructure/apiClient';

// M5 — Member dashboard (Epic F). Member-only endpoints: a 401 goes through
// the apiClient refresh interceptor automatically.

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboard(),
    staleTime: 30_000,
  });
}

export function useHistory(page: number, limit = 10) {
  return useQuery({
    queryKey: ['history', page, limit],
    queryFn: () => api.getHistory(page, limit),
    staleTime: 30_000,
    placeholderData: (prev) => prev, // keep the old page while the next loads
  });
}
