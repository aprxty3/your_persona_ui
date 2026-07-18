import { z } from 'zod';

export const GuestStatusSchema = z.enum([
  'student',
  'worker',
  'freelancer',
  'unemployed',
  'other',
]);
export type GuestStatus = z.infer<typeof GuestStatusSchema>;

export const LocaleSchema = z.enum(['en', 'id']);
export type Locale = z.infer<typeof LocaleSchema>;

// POST /v1/guest-session — request body (swagger: dto.CreateGuestSessionRequestDTO).
export const CreateGuestSessionRequestSchema = z.object({
  display_name: z.string().min(1),
  age: z.number().int().min(13),
  status: GuestStatusSchema,
  locale: LocaleSchema,
});
export type CreateGuestSessionRequest = z.infer<
  typeof CreateGuestSessionRequestSchema
>;

// Response 201 — PascalCase is the AS-BUILT contract: the Go struct
// auth.CreateGuestSessionResponse has no json tags (the only response besides
// SubmitResponse like this — every other response is snake_case).
// Do NOT "clean this up" to snake_case here without a BE change first.
export const CreateGuestSessionResponseSchema = z.object({
  SessionID: z.string(),
  ExpiresAt: z.string(), // RFC 3339
});
export type CreateGuestSessionResponse = z.infer<
  typeof CreateGuestSessionResponseSchema
>;
