import { z } from 'zod';
import { GuestStatusSchema, LocaleSchema } from './guestSession';

// M5 — Account, Referral & Compliance (Tech Doc §5.5).

// PATCH /v1/account/profile — partial update: send only what changed.
export const UpdateProfileRequestSchema = z.object({
  display_name: z.string().trim().min(1).optional(),
  age: z.number().int().min(13).optional(),
  status: GuestStatusSchema.optional(),
  preferred_locale: LocaleSchema.optional(),
});
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

export const ProfileResponseSchema = z.object({
  user_id: z.string(),
  display_name: z.string().nullish(),
  age: z.number().int().nullish(),
  status: z.string().nullish(),
  preferred_locale: z.string(),
});
export type ProfileResponse = z.infer<typeof ProfileResponseSchema>;

// GET /v1/account/referral-code — generated once, permanent per user.
export const ReferralCodeResponseSchema = z.object({
  code: z.string(),
});
export type ReferralCodeResponse = z.infer<typeof ReferralCodeResponseSchema>;

// GET /v1/account/referral-stats — AGGREGATE ONLY (UU PDP): never any invitee
// identity. code: "" = never generated (200, not 404).
export const ReferralStatsResponseSchema = z.object({
  code: z.string(),
  signup_count: z.number().int(),
  completed_count: z.number().int(),
});
export type ReferralStatsResponse = z.infer<typeof ReferralStatsResponseSchema>;
