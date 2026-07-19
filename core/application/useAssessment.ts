'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/core/infrastructure/apiClient';
import { track } from '@/core/infrastructure/analytics';
import type { SubmitRequest, SubmitResponse } from '@/core/domain/assessment';
import { useAssessmentStore } from './stores/assessmentStore';

// M3 — question bank + submit. Components never fetch directly (AGENTS.md).

export function useQuestions(locale: string) {
  return useQuery({
    queryKey: ['questions', locale],
    queryFn: () => api.getQuestions(locale),
    // Question bank is static content — no refetch churn mid-assessment.
    staleTime: Infinity,
    retry: 1,
  });
}

export function useSubmitAssessment() {
  const ensureIdempotencyKey = useAssessmentStore((s) => s.ensureIdempotencyKey);
  const clearAfterSuccess = useAssessmentStore((s) => s.clearAfterSuccess);

  return useMutation<SubmitResponse, Error, SubmitRequest>({
    mutationFn: (input) => {
      // One key per payload snapshot (§4.2): retries reuse it (no double Gemini
      // burn); changed answers mint a new key (old key + new payload = 409).
      const key = ensureIdempotencyKey(JSON.stringify(input.answers));
      return api.submitAssessment(input, key);
    },
    onSuccess: () => {
      track('assessment_submitted');
      // Drop key + snapshot + answers only AFTER success (§4.2).
      clearAfterSuccess();
    },
    retry: false, // retries are a user decision here — Gemini calls are expensive
  });
}
