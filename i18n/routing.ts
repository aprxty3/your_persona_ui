import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['en', 'id'],
  defaultLocale: 'en',
  // EN without prefix (yourpersonas.com/), ID at /id — clean default URLs for SEO.
  localePrefix: 'as-needed',
});

export type AppLocale = (typeof routing.locales)[number];

// Type guard replacing next-intl v4's `hasLocale` (not exported by the v3.x
// line this project resolves to).
export function isAppLocale(value: unknown): value is AppLocale {
  return routing.locales.includes(value as AppLocale);
}

// Use Link/useRouter from here, NOT from next/link / next/navigation,
// so the active locale is always carried along automatically.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
