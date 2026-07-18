'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/core/infrastructure/apiClient';
import { track } from '@/core/infrastructure/analytics';
import type { CreateGuestSessionRequest } from '@/core/domain/guestSession';
import { useAuthStore } from './stores/authStore';

// M2 — Guest onboarding. The session_id cookie is managed by the BE (httpOnly);
// the FE never reads/writes/sends it manually (AGENTS.md Security Rules).
export function useCreateGuestSession() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useMutation({
    mutationFn: async (input: CreateGuestSessionRequest) => {
      // Members skip guest-session (checklist M2) — data comes from the account.
      if (isAuthenticated) return null;
      return api.createGuestSession(input);
    },
    onSuccess: () => track('onboarding_completed'),
  });
}
