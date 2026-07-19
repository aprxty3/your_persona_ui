'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/core/infrastructure/apiClient';
import type { Result } from '@/core/domain/assessment';

// M4 — result detail + mascot style persistence.

export function useResult(resultId: string) {
  return useQuery<Result, Error>({
    queryKey: ['result', resultId],
    queryFn: () => api.getResult(resultId),
    staleTime: 60_000,
    retry: (failureCount, error) => {
      // Expired/unknown result (Guest TTL 14 days) is a terminal state — do
      // not hammer the BE hoping it comes back.
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });
}

export function useSetMascotStyle(resultId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (style: 'style_a' | 'style_b') =>
      api.setMascotStyle(resultId, style),
    // Optimistic: the switcher must feel instant (purely visual field).
    onMutate: async (style) => {
      await queryClient.cancelQueries({ queryKey: ['result', resultId] });
      const previous = queryClient.getQueryData<Result>(['result', resultId]);
      if (previous) {
        queryClient.setQueryData<Result>(['result', resultId], {
          ...previous,
          mascot_style: style,
        });
      }
      return { previous };
    },
    onError: (_err, _style, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['result', resultId], context.previous);
      }
    },
  });
}
