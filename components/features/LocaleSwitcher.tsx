'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { routing, type AppLocale } from '@/i18n/routing';

export function LocaleSwitcher() {
  const t = useTranslations('common.localeSwitcher');
  const active = useLocale();
  const pathname = usePathname();

  return (
    <nav
      aria-label={t('label')}
      className="flex items-center gap-1 rounded-2xl border-2 border-primary-100 bg-white p-1"
    >
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale as AppLocale}
          aria-current={active === locale ? 'true' : undefined}
          className={
            'rounded-xl px-2.5 py-1 text-xs font-bold transition-colors ' +
            (active === locale
              ? 'bg-primary text-white'
              : 'text-slate-500 hover:text-primary-700')
          }
        >
          {t(locale as AppLocale)}
        </Link>
      ))}
    </nav>
  );
}
