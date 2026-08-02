'use client';

import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/core/infrastructure/apiClient';


export function usePdfStatus(resultId: string, enabled = true) {
  const startedAt = useRef(Date.now());

  return useQuery({
    queryKey: ['pdfStatus', resultId],
    queryFn: () => api.getPdfStatus(resultId),
    enabled,
    refetchInterval: (query) => {
      const s = query.state.data?.pdf_status;
      if (s === 'completed' || s === 'failed') return false; // failed = STOP now
      if (Date.now() - startedAt.current > 90_000) return false; // total deadline
      return Math.min(2000 * 2 ** query.state.dataUpdateCount, 10_000);
    },
  });
}
