import { beforeEach, describe, expect, test } from 'bun:test';

// bun:test has no DOM — session.ts reads window/document at call time, so
// installing stubs before each test is enough. (Other test files swap these
// globals too; re-assigning per test keeps the files order-independent.)
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

const documentStub = makeDocumentStub();
const localStore = new Map<string, string>();

const windowStub = {
  localStorage: {
    getItem: (k: string) => localStore.get(k) ?? null,
    setItem: (k: string, v: string) => void localStore.set(k, v),
    removeItem: (k: string) => void localStore.delete(k),
  },
};
(globalThis as Record<string, unknown>).document = documentStub;
(globalThis as Record<string, unknown>).window = windowStub;

const { clearSession, getAccessToken, getCookie, getRefreshToken, storeTokens } =
  await import('./session');

beforeEach(() => {
  (globalThis as Record<string, unknown>).document = documentStub;
  (globalThis as Record<string, unknown>).window = windowStub;
  clearSession();
  documentStub.jar.clear();
  localStore.clear();
});

describe('getCookie', () => {
  test('reads a cookie by exact name', () => {
    documentStub.cookie = 'csrf_token=abc123; path=/';
    expect(getCookie('csrf_token')).toBe('abc123');
  });

  test('missing cookie → null', () => {
    expect(getCookie('csrf_token')).toBeNull();
  });

  test('URL-encoded values are decoded', () => {
    documentStub.cookie = 'csrf_token=a%3Db%2Fc';
    expect(getCookie('csrf_token')).toBe('a=b/c');
  });

  test('a cookie whose name merely ends with the target is not matched', () => {
    documentStub.cookie = 'x_csrf_token=WRONG';
    documentStub.cookie = 'csrf_token=right';
    expect(getCookie('csrf_token')).toBe('right');
  });
});

describe('token storage (§5.1: access in-memory, refresh in localStorage)', () => {
  test('storeTokens round-trips through the getters', () => {
    storeTokens('acc-1', 'ref-1');
    expect(getAccessToken()).toBe('acc-1');
    expect(getRefreshToken()).toBe('ref-1');
  });

  test('refresh token lands in localStorage — access token NEVER does', () => {
    storeTokens('acc-1', 'ref-1');
    expect([...localStore.values()]).toContain('ref-1');
    expect([...localStore.values()]).not.toContain('acc-1');
  });

  test('storeTokens sets the yp_session UX flag cookie for the middleware (§5.2)', () => {
    storeTokens('acc-1', 'ref-1');
    expect(getCookie('yp_session')).toBe('1');
  });

  test('clearSession wipes access token, refresh token, and the flag cookie', () => {
    storeTokens('acc-1', 'ref-1');
    clearSession();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(getCookie('yp_session')).toBeNull();
    expect(localStore.size).toBe(0);
  });

  test('rotation: a second storeTokens fully replaces the pair', () => {
    storeTokens('acc-1', 'ref-1');
    storeTokens('acc-2', 'ref-2');
    expect(getAccessToken()).toBe('acc-2');
    expect(getRefreshToken()).toBe('ref-2');
    expect([...localStore.values()]).not.toContain('ref-1');
  });
});
