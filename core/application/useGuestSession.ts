'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/core/infrastructure/apiClient';
import { track } from '@/core/infrastructure/analytics';
import type { CreateGuestSessionRequest } from '@/core/domain/guestSession';
import { useAuthStore } from './stores/authStore';


export function useCreateGuestSession() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useMutation({
    mutationFn: async (input: CreateGuestSessionRequest) => {
      if (isAuthenticated) return null;
      return api.createGuestSession(input);
    },
    onSuccess: () => track('onboarding_completed'),
  });
}
