'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/core/infrastructure/apiClient';
import { track } from '@/core/infrastructure/analytics';
import type {
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  VerifyEmailOTPRequest,
  VerifyResetOTPRequest,
} from '@/core/domain/auth';
import { useAuthStore } from './stores/authStore';

// M5 — auth mutations. Shared pattern: mutation → apiClient → token pair into
// authStore (access in-memory, refresh localStorage).

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

export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterRequest & { fromClaim?: boolean }) => {
      const { fromClaim: _fromClaim, ...payload } = input;
      return api.register(payload);
    },
    onSuccess: (_res, input) => {
      // Funnel metric (§8): Guest→Member conversion via the claim banner.
      if (input.fromClaim) track('register_from_claim');
    },
  });
}

// Success = auto-login (the BE returns tokens straight from OTP verification).
export function useVerifyEmailOtp() {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: (input: VerifyEmailOTPRequest) => api.verifyEmailOtp(input),
    onSuccess: (pair) => setSession(pair.access_token, pair.refresh_token),
  });
}

export function useResendEmailOtp() {
  return useMutation({
    mutationFn: (email: string) => api.resendEmailOtp(email),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordRequest) => api.forgotPassword(input),
  });
}

export function useVerifyResetOtp() {
  return useMutation({
    mutationFn: (input: VerifyResetOTPRequest) => api.verifyResetOtp(input),
  });
}

// Success = auto-login with fresh tokens (all old sessions revoked by the BE).
export function useResetPassword() {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: (input: ResetPasswordRequest) => api.resetPassword(input),
    onSuccess: (pair) => setSession(pair.access_token, pair.refresh_token),
  });
}
