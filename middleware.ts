import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Locale negotiation (EN default + ID) + the /dashboard UX gate (Tech Doc
// §5.2): refresh_token lives in localStorage, so the server can't see login
// state — the non-httpOnly `yp_session` flag (set/cleared by session.ts) only
// prevents a flash of protected content. REAL security stays in the API: no
// valid token = 401 → interceptor → login redirect.

const intlMiddleware = createMiddleware(routing);

const SESSION_FLAG_COOKIE = 'yp_session';
// Matches /dashboard and /{locale}/dashboard (localePrefix: 'as-needed').
const DASHBOARD_RE = /^\/(?:en\/|id\/)?dashboard(?:\/|$)/;

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (DASHBOARD_RE.test(pathname) && !req.cookies.has(SESSION_FLAG_COOKIE)) {
    const locale = pathname.startsWith('/id/') ? '/id' : '';
    return NextResponse.redirect(new URL(`${locale}/auth/login`, req.url));
  }

  return intlMiddleware(req);
}

export const config = {
  // Skip static assets, metadata routes, and internal API route handlers.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
