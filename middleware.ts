import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Locale negotiation (EN default + ID) — the FE side of FR-I.
// M5 will add the `/dashboard` UX gate via the `yp_session` cookie flag
// (Tech Doc §5.2) — a pure UX flag; real security stays in the API.
export default createMiddleware(routing);

export const config = {
  // Skip static assets, metadata routes, and internal API route handlers.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
