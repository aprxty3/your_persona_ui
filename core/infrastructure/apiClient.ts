import { z } from 'zod';
import { EnvelopeSchema } from '@/core/domain/envelope';
import {
  CreateGuestSessionRequestSchema,
  CreateGuestSessionResponseSchema,
  type CreateGuestSessionRequest,
} from '@/core/domain/guestSession';
import {
  RegisterResponseSchema,
  TokenPairSchema,
  VerifyResetOTPResponseSchema,
  type ForgotPasswordRequest,
  type LoginRequest,
  type RegisterRequest,
  type ResetPasswordRequest,
  type TokenPair,
  type VerifyEmailOTPRequest,
  type VerifyResetOTPRequest,
} from '@/core/domain/auth';
import {
  PdfStatusSchema,
  QuestionListSchema,
  ResultSchema,
  SubmitRequestSchema,
  SubmitResponseSchema,
  type SubmitRequest,
} from '@/core/domain/assessment';
import {
  DashboardResponseSchema,
  HistoryItemSchema,
  PaginationMetaSchema,
} from '@/core/domain/dashboard';
import {
  ProfileResponseSchema,
  ReferralCodeResponseSchema,
  ReferralStatsResponseSchema,
  UpdateProfileRequestSchema,
  type UpdateProfileRequest,
} from '@/core/domain/account';
import {
  clearSession,
  getAccessToken,
  getCookie,
  getRefreshToken,
  storeTokens,
} from './session';

// The single gateway to the BE (AGENTS.md): components are FORBIDDEN to fetch
// directly — always hooks (core/application) → this apiClient. Centralized
// responsibilities: envelope parsing, 401→refresh→retry interceptor,
// X-CSRF-Token header, Idempotency-Key injection, credentials include
// (session_id/csrf_token cookies).

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly meta?: Record<string, unknown>,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** meta.retry_after_seconds for RATE_LIMITED (Tech Doc §9). */
  get retryAfterSeconds(): number | undefined {
    const v = this.meta?.['retry_after_seconds'];
    return typeof v === 'number' ? v : undefined;
  }

  /** meta.attempts_remaining for INVALID_OTP and friends. */
  get attemptsRemaining(): number | undefined {
    const v = this.meta?.['attempts_remaining'];
    return typeof v === 'number' ? v : undefined;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Extra per-call headers, e.g. Idempotency-Key on submit (§4.2). */
  headers?: Record<string, string>;
  /**
   * true for the auth endpoints themselves (login/refresh/logout) — a 401
   * from them must NOT trigger a refresh loop.
   */
  skipAuthRefresh?: boolean;
};

// Single-flight: many concurrent 401s → ONE refresh call, everyone awaits the
// same promise (the "pause → refresh → resume" contract, §4.4).
let refreshInFlight: Promise<void> | null = null;

async function refreshSession(): Promise<void> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw new ApiError('UNAUTHORIZED', 'No session', 401);
      const pair = await request(TokenPairSchema, '/v1/auth/refresh', {
        method: 'POST',
        body: { refresh_token: refreshToken },
        skipAuthRefresh: true,
      });
      // BE rotation: the old refresh_token is already denylisted — MUST replace.
      storeTokens(pair.access_token, pair.refresh_token);
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function request<S extends z.ZodTypeAny>(
  schema: S,
  path: string,
  opts: RequestOptions = {},
): Promise<z.infer<S>> {
  const { data } = await requestWithMeta(schema, path, opts);
  return data;
}

// Same pipeline, but also surfaces envelope.meta — needed for paginated
// endpoints (history) where pagination lives in meta, not data (§4.3 envelope).
async function requestWithMeta<S extends z.ZodTypeAny>(
  schema: S,
  path: string,
  opts: RequestOptions = {},
  isRetry = false,
): Promise<{ data: z.infer<S>; meta?: Record<string, unknown> }> {
  const method = opts.method ?? 'GET';
  const headers: Record<string, string> = { ...opts.headers };

  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  const accessToken = getAccessToken();
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  // CSRF double-submit (§5.4): send on ALL non-GET — the BE only enforces it
  // on 4 endpoints and ignores the rest; "always send" beats an FE allowlist.
  if (method !== 'GET') {
    const csrf = getCookie('csrf_token');
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }

  let res: Response;
  try {
    res = await fetch(BASE_URL + path, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: 'include', // cookie session_id (Guest) + csrf_token
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Network request failed', 0);
  }

  const requestId = res.headers.get('X-Request-ID') ?? undefined;

  let envelope;
  try {
    envelope = EnvelopeSchema.parse(await res.json());
  } catch {
    throw new ApiError(
      res.status >= 500 ? 'SERVICE_UNAVAILABLE' : 'INTERNAL_ERROR',
      `Unexpected response (HTTP ${res.status})`,
      res.status,
      undefined,
      requestId,
    );
  }

  if (!res.ok || !envelope.success) {
    const code = envelope.error?.code ?? 'INTERNAL_ERROR';
    const message = envelope.error?.message ?? 'Unexpected error';
    const meta = (envelope.meta ?? undefined) as
      | Record<string, unknown>
      | undefined;

    // 401 interceptor (§4.4): hold → refresh → replay the same request.
    // Guests are unaffected (no refresh token → the error is thrown as-is).
    if (
      res.status === 401 &&
      !opts.skipAuthRefresh &&
      !isRetry &&
      getRefreshToken()
    ) {
      try {
        await refreshSession();
      } catch {
        clearSession();
        throw new ApiError(code, message, res.status, meta, requestId);
      }
      return requestWithMeta(schema, path, opts, true);
    }

    throw new ApiError(code, message, res.status, meta, requestId);
  }

  return {
    data: schema.parse(envelope.data) as z.infer<S>,
    meta: (envelope.meta ?? undefined) as Record<string, unknown> | undefined,
  };
}

// ---------------------------------------------------------------------------
// Endpoint bindings — grows per milestone; shapes always come from core/domain.
// ---------------------------------------------------------------------------

export const api = {
  // M2 — Guest onboarding. NOT Turnstile-gated (§5.3), NOT CSRF-enforced.
  createGuestSession(input: CreateGuestSessionRequest) {
    return request(CreateGuestSessionResponseSchema, '/v1/guest-session', {
      method: 'POST',
      body: CreateGuestSessionRequestSchema.parse(input),
    });
  },

  // M3 — question bank (also primes the csrf_token cookie before submit).
  getQuestions(locale: string) {
    return request(
      QuestionListSchema,
      `/v1/questions?locale=${encodeURIComponent(locale)}`,
    );
  },

  // M3 — submit. Idempotency-Key comes from the assessment store (§4.2);
  // CSRF header is added automatically above. Gemini runs synchronously on the
  // BE (Waiting Room UX) — the fetch simply stays in flight for 3-8s.
  submitAssessment(input: SubmitRequest, idempotencyKey: string) {
    return request(SubmitResponseSchema, '/v1/assessment/submit', {
      method: 'POST',
      body: SubmitRequestSchema.parse(input),
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },

  // M4 — result detail. Full response for ANY link holder (FR-D8); teaser/blur
  // for non-owners is FE rendering driven by `is_owner`, not BE field cuts.
  getResult(resultId: string) {
    return request(ResultSchema, `/v1/results/${encodeURIComponent(resultId)}`);
  },

  // M4 — mascot style persistence (FR-D11). Purely visual; owner-only on the BE.
  setMascotStyle(resultId: string, style: 'style_a' | 'style_b') {
    return request(
      z.record(z.string(), z.unknown()),
      `/v1/results/${encodeURIComponent(resultId)}/mascot-style`,
      { method: 'PATCH', body: { mascot_style: style } },
    );
  },

  // M5 — auth.
  login(input: LoginRequest): Promise<TokenPair> {
    return request(TokenPairSchema, '/v1/auth/login', {
      method: 'POST',
      body: input,
      skipAuthRefresh: true,
    });
  },

  register(input: RegisterRequest) {
    // Sent WITH credentials: a live guest session_id cookie triggers the
    // Guest→Member claim on the BE (onboarding data copy + result reassign).
    return request(RegisterResponseSchema, '/v1/auth/register', {
      method: 'POST',
      body: input,
      skipAuthRefresh: true,
    });
  },

  // Success = auto-login (BE returns the token pair — no separate /login step).
  verifyEmailOtp(input: VerifyEmailOTPRequest): Promise<TokenPair> {
    return request(TokenPairSchema, '/v1/auth/verify-email-otp', {
      method: 'POST',
      body: input,
      skipAuthRefresh: true,
    });
  },

  // Cooldown 60s/email + cap 5x/day — RATE_LIMITED carries retry_after_seconds.
  resendEmailOtp(email: string) {
    return request(z.record(z.string(), z.unknown()), '/v1/auth/resend-email-otp', {
      method: 'POST',
      body: { email },
      skipAuthRefresh: true,
    });
  },

  // Always returns a generic 200, registered or not (anti-enumeration, FR-H4).
  forgotPassword(input: ForgotPasswordRequest) {
    return request(z.record(z.string(), z.unknown()), '/v1/auth/forgot-password', {
      method: 'POST',
      body: input,
      skipAuthRefresh: true,
    });
  },

  verifyResetOtp(input: VerifyResetOTPRequest) {
    return request(VerifyResetOTPResponseSchema, '/v1/auth/verify-reset-otp', {
      method: 'POST',
      body: input,
      skipAuthRefresh: true,
    });
  },

  // Success = auto-login; all old sessions are revoked via token_version.
  resetPassword(input: ResetPasswordRequest): Promise<TokenPair> {
    return request(TokenPairSchema, '/v1/auth/reset-password', {
      method: 'POST',
      body: input,
      skipAuthRefresh: true,
    });
  },

  // M5 — Member dashboard (Epic F).
  getDashboard() {
    return request(DashboardResponseSchema, '/v1/user-dashboard');
  },

  async getHistory(page: number, limit = 10) {
    const { data, meta } = await requestWithMeta(
      z.array(HistoryItemSchema),
      `/v1/user-dashboard/history?page=${page}&limit=${limit}`,
    );
    return {
      items: data,
      pagination: PaginationMetaSchema.nullish().catch(null).parse(meta ?? null),
    };
  },

  getPdfStatus(resultId: string) {
    return request(
      PdfStatusSchema,
      `/v1/results/${encodeURIComponent(resultId)}/pdf-status`,
    );
  },

  /**
   * PDF download (FR-E1–E4): the endpoint 302s to a signed R2 URL. fetch()
   * follows the redirect and hands back the PDF blob — needed because members
   * authenticate via the Authorization header, which window.open can't carry.
   *
   * credentials deliberately OMITTED (not 'include'): fetch() auto-follows
   * the 302 using the same credential mode, so 'include' puts the SECOND
   * hop — the cross-origin request straight to R2 — into credentialed CORS
   * mode too. R2's signed URL is already self-authorizing via its query
   * string and doesn't send Access-Control-Allow-Credentials, so the
   * browser blocks the response as a CORS violation. The Bearer header
   * alone is enough to authenticate the first hop (our own API).
   */
  async downloadPdf(resultId: string): Promise<Blob> {
    const headers: Record<string, string> = {};
    const accessToken = getAccessToken();
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    const res = await fetch(
      `${BASE_URL}/v1/results/${encodeURIComponent(resultId)}/pdf`,
      { headers },
    );
    if (!res.ok) {
      throw new ApiError('PDF_NOT_READY', 'PDF not available', res.status);
    }
    return res.blob();
  },

  // M5 — Account & compliance (§5.5). CSRF is enforced by the BE on profile
  // and delete-request(/cancel) — the header rides along automatically.
  updateProfile(input: UpdateProfileRequest) {
    return request(ProfileResponseSchema, '/v1/account/profile', {
      method: 'PATCH',
      body: UpdateProfileRequestSchema.parse(input),
    });
  },

  getReferralCode() {
    return request(ReferralCodeResponseSchema, '/v1/account/referral-code');
  },

  getReferralStats() {
    return request(ReferralStatsResponseSchema, '/v1/account/referral-stats');
  },

  requestDeletion() {
    return request(z.record(z.string(), z.unknown()), '/v1/account/delete-request', {
      method: 'POST',
    });
  },

  cancelDeletion() {
    return request(
      z.record(z.string(), z.unknown()),
      '/v1/account/delete-request/cancel',
      { method: 'POST' },
    );
  },

  async logout(): Promise<void> {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      // BE denylists the refresh token; idempotent — even expired returns 200.
      await request(z.record(z.string(), z.unknown()), '/v1/auth/logout', {
        method: 'POST',
        body: { refresh_token: refreshToken },
        skipAuthRefresh: true,
      }).catch(() => undefined); // local logout proceeds even if the BE call fails
    }
    clearSession();
  },

  /** App/tab boot (§5.1): fill the access token from the persisted refresh_token. */
  async bootstrapSession(): Promise<boolean> {
    if (!getRefreshToken()) return false;
    try {
      await refreshSession();
      return true;
    } catch {
      clearSession();
      return false;
    }
  },
};
