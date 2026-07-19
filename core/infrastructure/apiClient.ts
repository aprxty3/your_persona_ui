import { z } from 'zod';
import { EnvelopeSchema } from '@/core/domain/envelope';
import {
  CreateGuestSessionRequestSchema,
  CreateGuestSessionResponseSchema,
  type CreateGuestSessionRequest,
} from '@/core/domain/guestSession';
import {
  TokenPairSchema,
  type LoginRequest,
  type TokenPair,
} from '@/core/domain/auth';
import {
  QuestionListSchema,
  ResultSchema,
  SubmitRequestSchema,
  SubmitResponseSchema,
  type SubmitRequest,
} from '@/core/domain/assessment';
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
  isRetry = false,
): Promise<z.infer<S>> {
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
      return request(schema, path, opts, true);
    }

    throw new ApiError(code, message, res.status, meta, requestId);
  }

  return schema.parse(envelope.data) as z.infer<S>;
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

  // M5 — auth implementation example (login). Register/OTP/forgot to follow.
  login(input: LoginRequest): Promise<TokenPair> {
    return request(TokenPairSchema, '/v1/auth/login', {
      method: 'POST',
      body: input,
      skipAuthRefresh: true,
    });
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
