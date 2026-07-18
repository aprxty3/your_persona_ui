// Credential storage per the security contract (AGENTS.md / Tech Doc §5.1):
// - access_token: in-memory ONLY (module scope) — localStorage is FORBIDDEN.
// - refresh_token: localStorage (deliberate decision following the BE's
//   body-based transport; trade-off recorded in Tech Doc §5.1 & §12C).
// This module lives in infrastructure so apiClient never has to import the
// Zustand store (application layer) — the store wraps this module instead.

const REFRESH_TOKEN_KEY = 'yp_refresh_token';
const SESSION_FLAG_COOKIE = 'yp_session';

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function storeTokens(access: string, refresh: string): void {
  accessToken = access;
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  // Pure UX flag for the /dashboard middleware (Tech Doc §5.2) — NOT a credential.
  document.cookie = `${SESSION_FLAG_COOKIE}=1; path=/; max-age=${14 * 24 * 3600}; samesite=lax`;
}

export function clearSession(): void {
  accessToken = null;
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  document.cookie = `${SESSION_FLAG_COOKIE}=; path=/; max-age=0`;
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(name + '='));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}
