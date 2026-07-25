import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

// bun:test has no DOM — stub the browser globals session.ts touches BEFORE the
// module under test runs. The cookie jar mimics document.cookie semantics
// (assignment appends/replaces ONE cookie, never clobbers the whole jar).
function makeDocumentStub() {
  const jar = new Map<string, string>();
  return {
    jar,
    get cookie(): string {
      return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    },
    set cookie(assignment: string) {
      const [pair = '', ...attrs] = assignment.split(';').map((s) => s.trim());
      const eq = pair.indexOf('=');
      const name = pair.slice(0, eq);
      const value = pair.slice(eq + 1);
      if (attrs.some((a) => a.toLowerCase() === 'max-age=0')) jar.delete(name);
      else jar.set(name, value);
    },
  };
}

function makeLocalStorageStub() {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => void store.clear(),
  };
}

const documentStub = makeDocumentStub();
const localStorageStub = makeLocalStorageStub();
const windowStub = { localStorage: localStorageStub };
(globalThis as Record<string, unknown>).document = documentStub;
(globalThis as Record<string, unknown>).window = windowStub;

const { api, ApiError } = await import('./apiClient');
const { clearSession, getAccessToken, getRefreshToken, storeTokens } =
  await import('./session');

// ---------------------------------------------------------------------------
// fetch mock — routes by pathname so the test is immune to the BASE_URL env.
// ---------------------------------------------------------------------------

type RecordedCall = { pathname: string; method: string; headers: Record<string, string>; body: unknown };

let calls: RecordedCall[] = [];
let routes: Array<{
  match: (c: RecordedCall) => boolean;
  respond: (c: RecordedCall) => Response;
  times: number; // remaining uses; Infinity = always
}> = [];

function envelope(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

/** Register a route; earlier registrations win. `times` limits how often it fires. */
function route(
  match: (c: RecordedCall) => boolean,
  respond: (c: RecordedCall) => Response,
  times = Infinity,
) {
  routes.push({ match, respond, times });
}

globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const call: RecordedCall = {
    pathname: new URL(url, 'http://test.local').pathname,
    method: init?.method ?? 'GET',
    headers: (init?.headers as Record<string, string>) ?? {},
    body: init?.body ? JSON.parse(init.body as string) : undefined,
  };
  calls.push(call);
  for (const r of routes) {
    if (r.times > 0 && r.match(call)) {
      r.times -= 1;
      return r.respond(call);
    }
  }
  throw new Error(`Unmatched fetch: ${call.method} ${call.pathname}`);
}) as typeof fetch;

const callsTo = (pathname: string) => calls.filter((c) => c.pathname === pathname);

/** Nth recorded call to a path — throws instead of returning undefined (strict index access). */
function callTo(pathname: string, nth = 0): RecordedCall {
  const call = callsTo(pathname)[nth];
  if (!call) throw new Error(`No call #${nth} to ${pathname}`);
  return call;
}

beforeEach(() => {
  // Other test files swap these globals — re-install ours per test so the
  // suite stays order-independent.
  (globalThis as Record<string, unknown>).document = documentStub;
  (globalThis as Record<string, unknown>).window = windowStub;
  calls = [];
  routes = [];
  clearSession();
  documentStub.jar.clear();
  localStorageStub.clear();
});

afterEach(() => {
  clearSession();
});

// ---------------------------------------------------------------------------
// 1. Envelope parsing
// ---------------------------------------------------------------------------

describe('envelope parsing', () => {
  test('{ success: true, data } resolves to the parsed data', async () => {
    route(
      (c) => c.pathname === '/v1/results/r1/pdf-status',
      () => envelope({ success: true, data: { pdf_status: 'completed' } }),
    );

    const result = await api.getPdfStatus('r1');
    expect(result).toEqual({ pdf_status: 'completed' });
  });

  test('{ success: false, error } throws ApiError carrying code/message/meta/requestId', async () => {
    route(
      (c) => c.pathname === '/v1/auth/resend-email-otp',
      () =>
        envelope(
          {
            success: false,
            error: { code: 'RATE_LIMITED', message: 'Too many requests' },
            meta: { retry_after_seconds: 30 },
          },
          429,
          { 'X-Request-ID': 'req-42' },
        ),
    );

    const err = await api.resendEmailOtp('a@b.co').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.message).toBe('Too many requests');
    expect(err.status).toBe(429);
    expect(err.retryAfterSeconds).toBe(30);
    expect(err.requestId).toBe('req-42');
  });

  test('non-envelope 5xx body maps to SERVICE_UNAVAILABLE', async () => {
    route(
      (c) => c.pathname === '/v1/results/r1/pdf-status',
      () => new Response('<html>Bad Gateway</html>', { status: 502 }),
    );

    const err = await api.getPdfStatus('r1').catch((e) => e);
    expect(err.code).toBe('SERVICE_UNAVAILABLE');
    expect(err.status).toBe(502);
  });

  test('non-envelope 2xx body maps to INTERNAL_ERROR', async () => {
    route(
      (c) => c.pathname === '/v1/results/r1/pdf-status',
      () => new Response('not json', { status: 200 }),
    );

    const err = await api.getPdfStatus('r1').catch((e) => e);
    expect(err.code).toBe('INTERNAL_ERROR');
  });

  test('network failure maps to NETWORK_ERROR with status 0', async () => {
    route(
      (c) => c.pathname === '/v1/results/r1/pdf-status',
      () => {
        throw new TypeError('fetch failed');
      },
    );

    const err = await api.getPdfStatus('r1').catch((e) => e);
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.status).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. 401 → refresh → retry interceptor (§4.4)
// ---------------------------------------------------------------------------

const unauthorized = (code = 'UNAUTHORIZED') =>
  envelope({ success: false, error: { code, message: 'Unauthorized' } }, 401);

function routeRefreshSuccess() {
  route(
    (c) => c.pathname === '/v1/auth/refresh',
    () =>
      envelope({
        success: true,
        data: { access_token: 'new-access', refresh_token: 'new-refresh' },
      }),
  );
}

describe('401 → refresh → retry interceptor', () => {
  test('401 triggers refresh, replays the request with the new token, and rotates the stored pair', async () => {
    storeTokens('old-access', 'old-refresh');
    route((c) => c.pathname === '/v1/results/r1/pdf-status', () => unauthorized(), 1);
    routeRefreshSuccess();
    route(
      (c) => c.pathname === '/v1/results/r1/pdf-status',
      () => envelope({ success: true, data: { pdf_status: 'completed' } }),
    );

    const result = await api.getPdfStatus('r1');

    expect(result.pdf_status).toBe('completed');
    expect(callsTo('/v1/results/r1/pdf-status')).toHaveLength(2);
    expect(callTo('/v1/results/r1/pdf-status', 0).headers['Authorization']).toBe('Bearer old-access');
    expect(callTo('/v1/results/r1/pdf-status', 1).headers['Authorization']).toBe('Bearer new-access');
    expect(callTo('/v1/auth/refresh').body).toEqual({ refresh_token: 'old-refresh' });
    // BE rotation: the old refresh_token is denylisted — the pair MUST be replaced.
    expect(getRefreshToken()).toBe('new-refresh');
    expect(getAccessToken()).toBe('new-access');
  });

  test('refresh failure (INVALID_TOKEN) clears the session and rethrows the original error', async () => {
    storeTokens('old-access', 'old-refresh');
    route((c) => c.pathname === '/v1/results/r1/pdf-status', () => unauthorized(), 1);
    route(
      (c) => c.pathname === '/v1/auth/refresh',
      () =>
        envelope(
          { success: false, error: { code: 'INVALID_TOKEN', message: 'Denylisted' } },
          401,
        ),
    );

    const err = await api.getPdfStatus('r1').catch((e) => e);

    expect(err.code).toBe('UNAUTHORIZED');
    expect(err.status).toBe(401);
    // Auth state is fully cleaned: refresh_token gone, in-memory token reset.
    expect(getRefreshToken()).toBeNull();
    expect(getAccessToken()).toBeNull();
    // No second attempt at the original request.
    expect(callsTo('/v1/results/r1/pdf-status')).toHaveLength(1);
  });

  test('two parallel 401s share ONE refresh call (single-flight race guard)', async () => {
    storeTokens('old-access', 'old-refresh');
    route((c) => c.pathname === '/v1/results/rA/pdf-status', () => unauthorized(), 1);
    route((c) => c.pathname === '/v1/results/rB/pdf-status', () => unauthorized(), 1);
    routeRefreshSuccess();
    route(
      (c) => c.pathname.endsWith('/pdf-status'),
      () => envelope({ success: true, data: { pdf_status: 'completed' } }),
    );

    const [a, b] = await Promise.all([api.getPdfStatus('rA'), api.getPdfStatus('rB')]);

    expect(a.pdf_status).toBe('completed');
    expect(b.pdf_status).toBe('completed');
    expect(callsTo('/v1/auth/refresh')).toHaveLength(1);
  });

  test('TOKEN_VERSION_MISMATCH on 401 goes through the same refresh → retry path', async () => {
    storeTokens('old-access', 'old-refresh');
    route(
      (c) => c.pathname === '/v1/results/r1/pdf-status',
      () => unauthorized('TOKEN_VERSION_MISMATCH'),
      1,
    );
    routeRefreshSuccess();
    route(
      (c) => c.pathname === '/v1/results/r1/pdf-status',
      () => envelope({ success: true, data: { pdf_status: 'completed' } }),
    );

    const result = await api.getPdfStatus('r1');
    expect(result.pdf_status).toBe('completed');
    expect(callsTo('/v1/auth/refresh')).toHaveLength(1);
  });

  test('TOKEN_VERSION_MISMATCH with failing refresh = logout (session cleared)', async () => {
    storeTokens('old-access', 'old-refresh');
    route(
      (c) => c.pathname === '/v1/results/r1/pdf-status',
      () => unauthorized('TOKEN_VERSION_MISMATCH'),
    );
    route(
      (c) => c.pathname === '/v1/auth/refresh',
      () =>
        envelope(
          { success: false, error: { code: 'INVALID_TOKEN', message: 'Rotated out' } },
          401,
        ),
    );

    const err = await api.getPdfStatus('r1').catch((e) => e);
    expect(err.code).toBe('TOKEN_VERSION_MISMATCH');
    expect(getRefreshToken()).toBeNull();
  });

  test('guest (no refresh token): 401 is thrown as-is, refresh never attempted', async () => {
    route((c) => c.pathname === '/v1/results/r1/pdf-status', () => unauthorized());

    const err = await api.getPdfStatus('r1').catch((e) => e);
    expect(err.code).toBe('UNAUTHORIZED');
    expect(callsTo('/v1/auth/refresh')).toHaveLength(0);
    expect(callsTo('/v1/results/r1/pdf-status')).toHaveLength(1);
  });

  test('auth endpoints (skipAuthRefresh): 401 from login never triggers refresh', async () => {
    storeTokens('old-access', 'old-refresh'); // even with a stored session
    route(
      (c) => c.pathname === '/v1/auth/login',
      () =>
        envelope(
          { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Nope' } },
          401,
        ),
    );

    const err = await api
      .login({ email: 'a@b.co', password: 'x', cf_turnstile_response: 't' })
      .catch((e) => e);
    expect(err.code).toBe('INVALID_CREDENTIALS');
    expect(callsTo('/v1/auth/refresh')).toHaveLength(0);
  });

  test('a retried request that 401s again is NOT retried a second time (no infinite loop)', async () => {
    storeTokens('old-access', 'old-refresh');
    route((c) => c.pathname === '/v1/results/r1/pdf-status', () => unauthorized());
    routeRefreshSuccess();

    const err = await api.getPdfStatus('r1').catch((e) => e);
    expect(err.code).toBe('UNAUTHORIZED');
    expect(callsTo('/v1/results/r1/pdf-status')).toHaveLength(2);
    expect(callsTo('/v1/auth/refresh')).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 3. Header injection — CSRF (§5.4) & Idempotency-Key (§4.2)
// ---------------------------------------------------------------------------

describe('header injection', () => {
  const submitInput = {
    locale: 'en',
    answers: [{ question_id: 'q1', value: 'A' }],
  };
  const submitOk = () =>
    envelope({
      success: true,
      data: {
        ResultID: 'r1',
        MBTIType: 'INTJ',
        GritScore: 80,
        AISummaryText: 'ok',
        WellbeingFlag: false,
        Status: 'completed',
      },
    });

  test('X-CSRF-Token from the csrf_token cookie rides along on non-GET requests', async () => {
    documentStub.cookie = 'csrf_token=csrf-abc; path=/';
    route((c) => c.pathname === '/v1/assessment/submit', submitOk);

    await api.submitAssessment(submitInput, 'key-1');

    expect(callTo('/v1/assessment/submit').headers['X-CSRF-Token']).toBe('csrf-abc');
  });

  test('GET requests carry no X-CSRF-Token even when the cookie exists', async () => {
    documentStub.cookie = 'csrf_token=csrf-abc; path=/';
    route(
      (c) => c.pathname === '/v1/results/r1/pdf-status',
      () => envelope({ success: true, data: { pdf_status: 'pending' } }),
    );

    await api.getPdfStatus('r1');

    expect(callTo('/v1/results/r1/pdf-status').headers['X-CSRF-Token']).toBeUndefined();
  });

  test('non-GET without the cookie: header simply absent (guest pre-prime)', async () => {
    route((c) => c.pathname === '/v1/assessment/submit', submitOk);

    await api.submitAssessment(submitInput, 'key-1');

    expect(callTo('/v1/assessment/submit').headers['X-CSRF-Token']).toBeUndefined();
  });

  test('Idempotency-Key is sent on submit alongside the JSON body', async () => {
    route((c) => c.pathname === '/v1/assessment/submit', submitOk);

    await api.submitAssessment(submitInput, 'key-123');

    const call = callTo('/v1/assessment/submit');
    expect(call.headers['Idempotency-Key']).toBe('key-123');
    expect(call.headers['Content-Type']).toBe('application/json');
    expect(call.body).toEqual(submitInput);
  });
});
