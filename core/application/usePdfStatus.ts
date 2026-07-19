'use client';

import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/core/infrastructure/apiClient';

// §4.3 — PDF status polling (FR-E4/E5), copied VERBATIM from the Tech Doc
// contract: backoff 2s→4s→8s cap 10s using dataUpdateCount (successful fetch
// count — NOT fetchFailureCount), hard 90s total deadline, `failed` = stop
// immediately. A 401 mid-poll is held/refresh/replayed by the apiClient, so
// the cycle resumes at the same step with no extra logic here.

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
