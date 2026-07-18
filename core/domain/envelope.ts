import { z } from 'zod';

// Universal BE envelope (pkg/httpresponse):
// { success, data?, error?: { code, message }, meta? }
export const ErrorDetailSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export const EnvelopeSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: ErrorDetailSchema.nullish(),
  meta: z.record(z.string(), z.unknown()).nullish(),
});

export type Envelope = z.infer<typeof EnvelopeSchema>;
export type ErrorDetail = z.infer<typeof ErrorDetailSchema>;

// Error codes the FE maps (Tech Doc §9). Codes outside this list are still
// accepted as plain strings — never crash just because the BE added a new code.
export const KnownErrorCode = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'TOKEN_VERSION_MISMATCH',
  'INVALID_TOKEN',
  'INVALID_CREDENTIALS',
  'EMAIL_NOT_VERIFIED',
  'EMAIL_ALREADY_REGISTERED',
  'PASSWORD_TOO_SHORT',
  'PASSWORD_BREACHED',
  'PASSWORD_CONFIRMATION_MISMATCH',
  'ACCOUNT_LOCKED',
  'INVALID_OTP',
  'OTP_EXPIRED',
  'OTP_MAX_ATTEMPTS',
  'TURNSTILE_VERIFICATION_FAILED',
  'QUOTA_EXCEEDED',
  'RATE_LIMITED',
  'IDEMPOTENCY_KEY_REUSED',
  'LOCK_NOT_ACQUIRED',
  'RESULT_NOT_FOUND',
  'FORBIDDEN',
  'PDF_NOT_READY',
  'DELETION_ALREADY_REQUESTED',
  'NO_ACTIVE_DELETION_REQUEST',
  'DELETION_ALREADY_PROCESSING',
  'SERVICE_UNAVAILABLE',
  'INTERNAL_ERROR',
]);
export type KnownErrorCode = z.infer<typeof KnownErrorCode>;
