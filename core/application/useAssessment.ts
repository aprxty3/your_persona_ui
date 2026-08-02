'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/core/infrastructure/apiClient';
import { track } from '@/core/infrastructure/analytics';
import type { SubmitRequest, SubmitResponse } from '@/core/domain/assessment';
import { useAssessmentStore } from './stores/assessmentStore';


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
      const key = ensureIdempotencyKey(JSON.stringify(input.answers));
      return api.submitAssessment(input, key);
    },
    onSuccess: () => {
      track('assessment_submitted');
      clearAfterSuccess();
    },
    retry: false, // retries are a user decision here — Gemini calls are expensive
  });
}
