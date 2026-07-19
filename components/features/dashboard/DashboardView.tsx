'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useDashboard } from '@/core/application/useDashboard';
import { useLogout } from '@/core/application/useAuth';
import { useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GritTrendChart } from './GritTrendChart';
import { HistoryList } from './HistoryList';

// M5 — Member dashboard (Epic F): derived quota (FR-F2), GRIT trend (FR-F3),
// micro-insights (FR-F4, locale-aware strings from the BE — render AS-IS),
// history + PDF (FR-F5).

export function DashboardView() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useDashboard();
  const logout = useLogout();

  if (isLoading) {
    return (
      <Card className="text-center text-sm font-medium text-slate-500">
        {tc('loading')}
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card className="text-center">
        <p className="text-sm font-medium text-slate-600">{tc('errors.generic')}</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          {tc('cta.retry')}
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-5 pb-12">
      <header className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-extrabold text-slate-800">{t('title')}</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/settings"
            className="rounded-2xl px-3 py-2 text-sm font-bold text-primary-700 hover:bg-primary-50"
          >
            {t('settingsLink')}
          </Link>
          <Button
            variant="ghost"
            onClick={() =>
              logout.mutate(undefined, { onSuccess: () => router.push('/') })
            }
            loading={logout.isPending}
          >
            {t('logout')}
          </Button>
        </div>
      </header>

      {/* Quota (FR-F2, derived on the BE — never a stored counter) */}
      <Card tint="primary">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-slate-800">{t('quota.title')}</h2>
          <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-primary-700">
            {t('quota.remaining', { remaining: data.quota_remaining, limit: data.quota_limit })}
          </span>
        </div>
        {data.quota_remaining > 0 ? (
          <Link
            href="/assessment"
            className="mt-4 inline-block rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-soft hover:bg-primary-600"
          >
            {t('quota.ctaNewTest')}
          </Link>
        ) : (
          <p className="mt-3 text-sm text-slate-600">{t('quota.exhausted')}</p>
        )}
      </Card>

      {/* GRIT trend (FR-F3) */}
      <Card>
        <h2 className="font-extrabold text-slate-800">{t('trend.title')}</h2>
        <div className="mt-3">
          <GritTrendChart points={data.grit_trend} />
        </div>
      </Card>

      {/* Micro-insights (FR-F4): [] = hide the section, never a placeholder */}
      {data.micro_insights.length > 0 && (
        <Card tint="secondary">
          <h2 className="font-extrabold text-slate-800">{t('insights.title')}</h2>
          <ul className="mt-3 space-y-2">
            {data.micro_insights.map((insight, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span aria-hidden>✨</span>
                {/* Already locale-aware from the BE — render as-is */}
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* History (FR-F5) */}
      <section>
        <h2 className="mb-3 font-extrabold text-slate-800">{t('history.title')}</h2>
        <HistoryList />
      </section>
    </div>
  );
}
