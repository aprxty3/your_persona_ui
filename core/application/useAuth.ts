'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/core/infrastructure/apiClient';
import type { LoginRequest } from '@/core/domain/auth';
import { useAuthStore } from './stores/authStore';

// Auth implementation example (login) — the same pattern applies to
// register/verify-OTP/forgot-password in M5: mutation → apiClient →
// store the token pair via authStore (access in-memory, refresh localStorage).

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: (input: LoginRequest) => api.login(input),
    onSuccess: (pair) => setSession(pair.access_token, pair.refresh_token),
  });
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);

  return useMutation({
    mutationFn: () => api.logout(),
    onSettled: () => clear(), // local state is cleared even if the BE call fails
  });
}
