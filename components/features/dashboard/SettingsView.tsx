'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import {
  useCancelDeletion,
  useReferralCode,
  useReferralStats,
  useRequestDeletion,
  useUpdateProfile,
} from '@/core/application/useAccount';
import { ApiError } from '@/core/infrastructure/apiClient';
import { LocaleSchema } from '@/core/domain/guestSession';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// M5 — settings: locale preference (FR-I3), referral code + aggregate stats
// (FR-G1, UU PDP: no invitee identity ever), account deletion with 14-day
// grace (FR-G2/G2a).

export function SettingsView() {
  const t = useTranslations('settings');

  return (
    <div className="space-y-5 pb-12">
      <header className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-extrabold text-slate-800">{t('title')}</h1>
        <Link
          href="/dashboard"
          className="rounded-2xl px-3 py-2 text-sm font-bold text-primary-700 hover:bg-primary-50"
        >
          {t('backToDashboard')}
        </Link>
      </header>

      <LocaleSection />
      <ReferralSection />
      <DeletionSection />
    </div>
  );
}

// ---- Locale preference (FR-I3) --------------------------------------------

function LocaleSection() {
  const t = useTranslations('settings.locale');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const updateProfile = useUpdateProfile();

  const onSwitch = (target: 'en' | 'id') => {
    if (target === locale) return;
    // Persist to the account first (emails/insights follow preferred_locale),
    // then swap the UI locale by re-navigating the same route.
    updateProfile.mutate(
      { preferred_locale: LocaleSchema.parse(target) },
      { onSuccess: () => router.replace(pathname, { locale: target }) },
    );
  };

  return (
    <Card>
      <h2 className="font-extrabold text-slate-800">{t('title')}</h2>
      <p className="mt-1 text-sm text-slate-600">{t('desc')}</p>
      <div className="mt-3 inline-flex rounded-2xl border-2 border-primary-100 bg-white p-1">
        {(['en', 'id'] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => onSwitch(l)}
            disabled={updateProfile.isPending}
            className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-colors ${
              locale === l ? 'bg-primary text-white' : 'text-slate-500 hover:bg-primary-50'
            }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </Card>
  );
}

// ---- Referral (FR-G1) ------------------------------------------------------

function ReferralSection() {
  const t = useTranslations('settings.referral');
  const [copied, setCopied] = useState(false);
  const stats = useReferralStats();
  // Generation is EXCLUSIVE to /referral-code — only fired on explicit request.
  const [wantCode, setWantCode] = useState(false);
  const code = useReferralCode(wantCode);

  const activeCode = code.data?.code || stats.data?.code || '';

  const onCopy = async () => {
    const url = `${window.location.origin}/?ref=${activeCode}`;
    await navigator.clipboard.writeText(url).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card tint="secondary">
      <h2 className="font-extrabold text-slate-800">{t('title')}</h2>
      <p className="mt-1 text-sm text-slate-600">{t('desc')}</p>

      {activeCode ? (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2">
            <code className="rounded-xl bg-white px-4 py-2 font-mono text-lg font-bold tracking-wider text-primary-700">
              {activeCode}
            </code>
            <Button variant="outline" onClick={onCopy}>
              {copied ? t('copied') : t('copyLink')}
            </Button>
          </div>
          {stats.data && (
            <div className="flex gap-4 text-sm text-slate-600">
              {/* Aggregate ONLY — the BE never exposes invitee identity */}
              <span>{t('signups', { count: stats.data.signup_count })}</span>
              <span>{t('completed', { count: stats.data.completed_count })}</span>
            </div>
          )}
        </div>
      ) : (
        <Button
          variant="outline"
          className="mt-3"
          onClick={() => setWantCode(true)}
          loading={code.isLoading && wantCode}
        >
          {t('generate')}
        </Button>
      )}
    </Card>
  );
}

// ---- Account deletion (FR-G2/G2a) -----------------------------------------

function DeletionSection() {
  const t = useTranslations('settings.deletion');
  const tc = useTranslations('common');
  const request = useRequestDeletion();
  const cancel = useCancelDeletion();
  const [confirming, setConfirming] = useState(false);
  // Deletion state isn't exposed via a GET — track what THIS session did.
  const [requested, setRequested] = useState(false);

  const err = request.error ?? cancel.error;
  const errorMessage = (() => {
    if (!err) return null;
    if (!(err instanceof ApiError)) return tc('errors.generic');
    switch (err.code) {
      case 'DELETION_ALREADY_REQUESTED':
        return t('errors.alreadyRequested');
      case 'NO_ACTIVE_DELETION_REQUEST':
        return t('errors.noActive');
      case 'DELETION_ALREADY_PROCESSING':
        return t('errors.processing');
      default:
        return tc('errors.generic');
    }
  })();

  return (
    <Card className="border-red-100">
      <h2 className="font-extrabold text-red-700">{t('title')}</h2>
      <p className="mt-1 text-sm text-slate-600">{t('desc')}</p>

      {requested || (err instanceof ApiError && err.code === 'DELETION_ALREADY_REQUESTED') ? (
        <div className="mt-3 space-y-3">
          <p className="rounded-2xl bg-amber-50 p-3 text-sm font-medium text-amber-700">
            {t('pendingNotice')}
          </p>
          <Button
            variant="outline"
            onClick={() =>
              cancel.mutate(undefined, { onSuccess: () => setRequested(false) })
            }
            loading={cancel.isPending}
          >
            {t('cancelRequest')}
          </Button>
        </div>
      ) : confirming ? (
        <div className="mt-3 space-y-3">
          <p className="rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700">
            {t('confirmNotice')}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-red-200 text-red-700 hover:border-red-400 hover:bg-red-50"
              onClick={() =>
                request.mutate(undefined, { onSuccess: () => setRequested(true) })
              }
              loading={request.isPending}
            >
              {t('confirmButton')}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              {tc('cta.back')}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          className="mt-3 text-red-700 hover:bg-red-50"
          onClick={() => setConfirming(true)}
        >
          {t('requestButton')}
        </Button>
      )}

      {errorMessage && !(err instanceof ApiError && err.code === 'DELETION_ALREADY_REQUESTED') && (
        <p role="alert" className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {errorMessage}
        </p>
      )}
    </Card>
  );
}
