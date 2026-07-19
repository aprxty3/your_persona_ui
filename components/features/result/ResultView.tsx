'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useResult, useSetMascotStyle } from '@/core/application/useResult';
import { useAuthStore } from '@/core/application/stores/authStore';
import { track } from '@/core/infrastructure/analytics';
import { ApiError } from '@/core/infrastructure/apiClient';
import { gritBand, type Result } from '@/core/domain/assessment';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// M4 — Grand Reveal (Epic D). The API returns the FULL result to any link
// holder (FR-D8, UUID unguessable); teaser vs full is a RENDERING decision
// driven by `is_owner` — never a field cut on the BE.

const TRAIT_PAIRS = ['EI', 'SN', 'TF', 'JP'] as const;

export function ResultView({ resultId }: { resultId: string }) {
  const t = useTranslations('results');
  const tc = useTranslations('common');
  const { data, isLoading, error } = useResult(resultId);
  const viewTracked = useRef(false);

  useEffect(() => {
    if (data && !viewTracked.current) {
      track('result_viewed', { is_owner: data.is_owner });
      viewTracked.current = true;
    }
  }, [data]);

  if (isLoading) {
    return (
      <Card className="text-center text-sm font-medium text-slate-500">
        {tc('loading')}
      </Card>
    );
  }

  // Expired / unknown result (Guest TTL 14 days, FR-G5) — dedicated page state.
  if (error instanceof ApiError && error.status === 404) {
    return (
      <Card tint="primary" className="text-center">
        <span aria-hidden className="text-4xl">🫥</span>
        <h1 className="mt-3 text-xl font-extrabold text-slate-800">{t('expired.title')}</h1>
        <p className="mt-2 text-sm text-slate-600">{t('expired.desc')}</p>
        <Link
          href="/onboarding"
          className="mt-5 inline-block rounded-2xl bg-primary px-6 py-3 font-bold text-white shadow-soft hover:bg-primary-600"
        >
          {t('expired.cta')}
        </Link>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="text-center text-sm font-medium text-slate-600">
        {tc('errors.generic')}
      </Card>
    );
  }

  return data.is_owner ? <FullResult result={data} /> : <TeaserResult result={data} />;
}

// ---------------------------------------------------------------------------

function MascotImage({ result, size }: { result: Result; size: number }) {
  const t = useTranslations('results');
  // Defensive (M0 #3): pre-scoring rows can have empty mbti_type — no broken img.
  if (!/^[EI][SN][TF][JP]$/.test(result.mbti_type)) return null;
  const style = result.mascot_style === 'style_b' ? 'style_b' : 'style_a';
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 160, damping: 14 }}
    >
      <Image
        src={`/mascots/${result.mbti_type}_${style}.jpeg`}
        alt={t('mascot.alt', { mbti: result.mbti_type })}
        width={size}
        height={size}
        priority
        className="mx-auto rounded-blob shadow-pop"
      />
    </motion.div>
  );
}

function TraitBars({ result }: { result: Result }) {
  const t = useTranslations('results');
  const scores = result.trait_scores;
  // Defensive: old zero-value data (all four pair keys 0/absent) → hide section
  // instead of rendering "100% second pole" lies.
  if (!scores || TRAIT_PAIRS.every((k) => !scores[k])) return null;

  return (
    <Card>
      <h2 className="font-extrabold text-slate-800">{t('traits.title')}</h2>
      <div className="mt-4 space-y-4">
        {TRAIT_PAIRS.map((pair) => {
          const value = scores[pair] ?? 50; // % leaning to the FIRST pole
          return (
            <div key={pair}>
              <div className="mb-1 flex justify-between text-xs font-bold text-slate-600">
                <span>{t(`traits.${pair}.first`)}</span>
                <span>{t(`traits.${pair}.second`)}</span>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full bg-primary-100">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-secondary-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${value}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <p className="mt-0.5 text-right text-[11px] font-medium text-slate-400">
                {value >= 50
                  ? `${value}% ${t(`traits.${pair}.first`)}`
                  : `${100 - value}% ${t(`traits.${pair}.second`)}`}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ShareButton({ resultId }: { resultId: string }) {
  const t = useTranslations('results');
  const [copied, setCopied] = useState(false);

  const onShare = async () => {
    track('share_clicked');
    // Share URL = /results/[id] ONLY — the contract has no share_token (§6.3).
    const url = `${window.location.origin}/results/${resultId}`;
    if (navigator.share) {
      await navigator.share({ url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="accent" size="lg" onClick={onShare} className="w-full">
      {copied ? t('share.copied') : t('share.button')}
    </Button>
  );
}

function ClaimBanner() {
  const t = useTranslations('results');
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current) {
      track('claim_banner_viewed');
      tracked.current = true;
    }
  }, []);

  // Loss-framing copy (FR-D7/FR-F1): "save it before it disappears".
  return (
    <Card tint="accent">
      <h2 className="font-extrabold text-slate-800">{t('claim.title')}</h2>
      <p className="mt-1.5 text-sm text-slate-600">{t('claim.desc')}</p>
      <Link
        href="/auth/login"
        className="mt-4 inline-block rounded-2xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-pop hover:bg-accent-700"
      >
        {t('claim.cta')}
      </Link>
    </Card>
  );
}

// ---------------------------------------------------------------------------

function FullResult({ result }: { result: Result }) {
  const t = useTranslations('results');
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setStyle = useSetMascotStyle(result.result_id);
  const band = gritBand(result.grit_score);

  return (
    <div className="space-y-5 pb-12">
      {/* Hero */}
      <div className="pt-4 text-center">
        <MascotImage result={result} size={220} />
        <p className="mt-4 text-sm font-bold uppercase tracking-wide text-primary-600">
          {t('hero.youAre')}
        </p>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-5xl font-extrabold tracking-tight text-slate-800"
        >
          {result.mbti_type || '????'}
        </motion.h1>

        {/* Mascot style switcher (FR-D11) — neutral labels, persisted via PATCH */}
        <div
          role="group"
          aria-label={t('mascot.styleLabel')}
          className="mt-4 inline-flex rounded-2xl border-2 border-primary-100 bg-white p-1"
        >
          {(['style_a', 'style_b'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStyle.mutate(s)}
              className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-colors ${
                result.mascot_style === s
                  ? 'bg-primary text-white'
                  : 'text-slate-500 hover:bg-primary-50'
              }`}
            >
              {s === 'style_a' ? t('mascot.styleA') : t('mascot.styleB')}
            </button>
          ))}
        </div>
      </div>

      {/* Wellbeing safety net (FR-B11) — ALONGSIDE the result, never replacing it */}
      {result.wellbeing_flag && (
        <Card tint="secondary" role="note">
          <h2 className="font-bold text-slate-800">{t('wellbeing.title')}</h2>
          <p className="mt-1.5 text-sm text-slate-600">{t('wellbeing.desc')}</p>
          <a
            href={t('wellbeing.resourceUrl')}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm font-bold text-secondary-700 underline"
          >
            {t('wellbeing.resourceLabel')}
          </a>
        </Card>
      )}

      {/* GRIT — score ALWAYS with its qualitative label (PRD Section 3a) */}
      <Card tint="primary">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-slate-800">{t('grit.title')}</h2>
          <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-primary-700">
            {t(`grit.band.${band}`)}
          </span>
        </div>
        <div className="mt-3 flex items-end gap-3">
          <span className="text-4xl font-extrabold text-primary-700">
            {result.grit_score}
          </span>
          <div className="mb-1.5 h-3 flex-1 overflow-hidden rounded-full bg-white">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-secondary-500 to-primary"
              initial={{ width: 0 }}
              animate={{ width: `${result.grit_score}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
      </Card>

      <TraitBars result={result} />

      {/* AI summary */}
      {result.ai_summary_text && (
        <Card>
          <h2 className="font-extrabold text-slate-800">{t('summary.title')}</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
            {result.ai_summary_text}
          </p>
        </Card>
      )}

      <ShareButton resultId={result.result_id} />

      {!isAuthenticated && <ClaimBanner />}
    </div>
  );
}

// ---------------------------------------------------------------------------

function TeaserResult({ result }: { result: Result }) {
  const t = useTranslations('results');

  return (
    <div className="space-y-5 pb-12 pt-4 text-center">
      <span className="inline-block rounded-full bg-accent-100 px-4 py-1 text-xs font-bold text-accent-700">
        {t('teaser.badge')}
      </span>
      <MascotImage result={result} size={180} />
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-primary-600">
          {t('hero.sharedIs')}
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-800">
          {result.mbti_type || '????'}
        </h1>
      </div>

      {/* Blur = pure FE rendering (FR-D3/D4); the data is intentionally there */}
      <Card className="relative overflow-hidden text-left">
        <div aria-hidden className="select-none blur-md">
          <h2 className="font-extrabold text-slate-800">{t('summary.title')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {(result.ai_summary_text || ' ').slice(0, 280)}
          </p>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/55 px-6">
          <h2 className="text-lg font-extrabold text-slate-800">{t('teaser.title')}</h2>
          <p className="mt-1.5 text-sm text-slate-600">{t('teaser.desc')}</p>
          <Link
            href="/onboarding"
            className="mt-4 rounded-2xl bg-accent px-6 py-3 font-bold text-white shadow-pop hover:bg-accent-700"
          >
            {t('teaser.cta')}
          </Link>
        </div>
      </Card>
    </div>
  );
}
