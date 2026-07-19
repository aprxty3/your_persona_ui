'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { track } from '@/core/infrastructure/analytics';
import { useAuthStore } from '@/core/application/stores/authStore';
import { Card } from '@/components/ui/Card';

// FR-D10: 429 QUOTA_EXCEEDED gets a dedicated panel with a register CTA —
// NEVER a generic error toast. Guest copy sells the upgrade (1 → 3 tests/month).

export function QuotaExceededPanel() {
  const t = useTranslations('assessment.quota');
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current) {
      track('quota_exceeded_viewed');
      tracked.current = true;
    }
  }, []);

  return (
    <Card tint="accent" className="text-center">
      <span aria-hidden className="text-4xl">⏳</span>
      <h2 className="mt-3 text-xl font-extrabold text-slate-800">{t('title')}</h2>
      <p className="mt-2 text-sm text-slate-600">
        {isAuthenticated ? t('descMember') : t('descGuest')}
      </p>
      {!isAuthenticated && (
        <Link
          href="/auth/login"
          className="mt-5 inline-block rounded-2xl bg-accent px-6 py-3 font-bold text-white shadow-pop hover:bg-accent-700"
        >
          {t('ctaRegister')}
        </Link>
      )}
    </Card>
  );
}
