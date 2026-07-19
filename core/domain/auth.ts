import { z } from 'zod';
import { LocaleSchema } from './guestSession';

// ---------- Requests (mirror dto/auth_dto.go) ----------

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  cf_turnstile_response: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10),
  preferred_locale: LocaleSchema,
  referral_code: z.string().nullish(), // BE normalizes ""/null/omit — all equivalent
  cf_turnstile_response: z.string().min(1),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const VerifyEmailOTPRequestSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});
export type VerifyEmailOTPRequest = z.infer<typeof VerifyEmailOTPRequestSchema>;

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email(),
  cf_turnstile_response: z.string().min(1),
});
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;

export const VerifyResetOTPRequestSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});
export type VerifyResetOTPRequest = z.infer<typeof VerifyResetOTPRequestSchema>;

export const ResetPasswordRequestSchema = z.object({
  reset_token: z.string().min(1),
  new_password: z.string().min(10),
});
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;

export const RefreshTokenRequestSchema = z.object({
  refresh_token: z.string().min(1),
});
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;

// ---------- Responses ----------

// Login / verify-email-otp (auto-login) / refresh / reset-password /
// change-password all return the same token pair shape.
export const TokenPairSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
});
export type TokenPair = z.infer<typeof TokenPairSchema>;

export const VerifyResetOTPResponseSchema = z.object({
  reset_token: z.string(),
});
export type VerifyResetOTPResponse = z.infer<
  typeof VerifyResetOTPResponseSchema
>;

// Register 201 — as-built: `userID` (Go field without a snake_case json tag).
export const RegisterResponseSchema = z.object({
  userID: z.string(),
});
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;

export const ResendEmailOTPRequestSchema = z.object({
  email: z.string().email(),
});
export type ResendEmailOTPRequest = z.infer<typeof ResendEmailOTPRequestSchema>;
