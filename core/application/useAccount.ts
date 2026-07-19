'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/core/infrastructure/apiClient';
import type { UpdateProfileRequest } from '@/core/domain/account';

// M5 — settings: profile (FR-I3), referral (FR-G1), deletion (FR-G2/G2a).

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProfileRequest) => api.updateProfile(input),
    onSuccess: () => {
      // Locale/profile changes affect dashboard content (micro_insights locale).
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Generate-on-first-request, permanent afterwards — exclusive to this endpoint.
export function useReferralCode(enabled: boolean) {
  return useQuery({
    queryKey: ['referralCode'],
    queryFn: () => api.getReferralCode(),
    enabled,
    staleTime: Infinity, // permanent per user — never refetch
  });
}

// code: "" + zero counters = never generated (200, NOT an error state).
export function useReferralStats() {
  return useQuery({
    queryKey: ['referralStats'],
    queryFn: () => api.getReferralStats(),
    staleTime: 60_000,
  });
}

export function useRequestDeletion() {
  return useMutation({ mutationFn: () => api.requestDeletion() });
}

export function useCancelDeletion() {
  return useMutation({ mutationFn: () => api.cancelDeletion() });
}

export function useDownloadPdf() {
  return useMutation({
    mutationFn: async (resultId: string) => {
      const blob = await api.downloadPdf(resultId);
      // Trigger the browser download from the fetched blob (Authorization
      // header can't ride on window.open — see apiClient.downloadPdf).
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `your-persona-${resultId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}
