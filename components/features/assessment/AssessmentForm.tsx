'use client';

import { useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useRouter } from '@/i18n/routing';
import { useQuestions, useSubmitAssessment } from '@/core/application/useAssessment';
import { useAssessmentStore } from '@/core/application/stores/assessmentStore';
import { track } from '@/core/infrastructure/analytics';
import { ApiError } from '@/core/infrastructure/apiClient';
import type { Question } from '@/core/domain/assessment';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  SjtCard,
  LikertCard,
  EssayCard,
  ESSAY_MIN_CHARS,
} from './QuestionInputs';
import { WaitingRoom } from './WaitingRoom';
import { QuotaExceededPanel } from './QuotaExceededPanel';

// M3 — the assessment engine (Epic B + C). Answers persist to localStorage via
// the Zustand store (FR-B6): refresh mid-essay loses nothing. Back navigation
// between sections is free — the BE upserts revised answers (FR-B10).

const SECTIONS = ['A', 'B', 'C'] as const;

export function AssessmentForm() {
  const t = useTranslations('assessment');
  const tc = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();

  const { data: questions, isLoading, isError, refetch } = useQuestions(locale);
  const submit = useSubmitAssessment();

  const answers = useAssessmentStore((s) => s.answers);
  const setAnswer = useAssessmentStore((s) => s.setAnswer);
  const sectionIdx = useAssessmentStore((s) => s.currentSection);
  const setSection = useAssessmentStore((s) => s.setSection);

  const [showIncomplete, setShowIncomplete] = useState(false);
  const cTracked = useRef(false);

  const bySection = useMemo(() => {
    const map: Record<string, Question[]> = { A: [], B: [], C: [] };
    for (const q of questions ?? []) {
      (map[q.section] ??= []).push(q);
    }
    for (const list of Object.values(map)) {
      list.sort((a, b) => a.display_order - b.display_order);
    }
    return map;
  }, [questions]);

  const section = SECTIONS[Math.min(sectionIdx, SECTIONS.length - 1)] ?? 'A';
  const sectionQuestions = bySection[section] ?? [];
  const all = questions ?? [];
  const answeredCount = all.filter((q) => isAnswered(q, answers[q.id])).length;

  function isAnswered(q: Question, value: string | undefined): boolean {
    if (!value) return false;
    if (q.type === 'essay_prompt') return value.trim().length >= ESSAY_MIN_CHARS;
    return value !== '';
  }

  const sectionComplete = sectionQuestions.every((q) => isAnswered(q, answers[q.id]));

  const goNext = () => {
    if (!sectionComplete) {
      setShowIncomplete(true);
      return;
    }
    setShowIncomplete(false);
    if (section === 'A') track('section_a_completed');
    if (section === 'B') track('section_b_completed');
    const next = sectionIdx + 1;
    if (SECTIONS[next] === 'C' && !cTracked.current) {
      track('section_c_started');
      cTracked.current = true;
    }
    setSection(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setShowIncomplete(false);
    setSection(Math.max(0, sectionIdx - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = () => {
    if (!sectionComplete) {
      setShowIncomplete(true);
      return;
    }
    track('section_c_completed');
    submit.mutate(
      {
        locale,
        answers: all.flatMap((q) => {
          const value = answers[q.id];
          return value ? [{ question_id: q.id, value }] : [];
        }),
      },
      { onSuccess: (res) => router.push(`/results/${res.ResultID}`) },
    );
  };

  // ---- Non-form states ------------------------------------------------------

  if (isLoading) {
    return (
      <Card className="text-center text-sm font-medium text-slate-500">
        {tc('loading')}
      </Card>
    );
  }

  if (isError || all.length === 0) {
    return (
      <Card className="text-center">
        <p className="text-sm font-medium text-slate-600">{tc('errors.generic')}</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          {tc('cta.retry')}
        </Button>
      </Card>
    );
  }

  const err = submit.error instanceof ApiError ? submit.error : null;
  if (err?.code === 'QUOTA_EXCEEDED') return <QuotaExceededPanel />;

  const errorMessage = err
    ? err.code === 'RATE_LIMITED'
      ? t('errors.rateLimited', { seconds: err.retryAfterSeconds ?? 60 })
      : err.code === 'VALIDATION_ERROR'
        ? t('errors.noSession')
        : err.code === 'NETWORK_ERROR'
          ? tc('errors.network')
          : tc('errors.generic')
    : null;

  // ---- The engine -----------------------------------------------------------

  return (
    <div className="space-y-6">
      {submit.isPending && <WaitingRoom />}

      {/* Progress (FR-B7): answered / total across the whole test */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
          <span className="text-primary-700">
            {t('progress.section', { section })}
          </span>
          <span className="text-slate-500">
            {t('progress.count', { answered: answeredCount, total: all.length })}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-primary-100">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary-500"
            animate={{ width: `${(answeredCount / all.length) * 100}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
      </div>

      <Card tint="primary" className="py-4">
        <h1 className="font-extrabold text-slate-800">
          {t(`sections.${section.toLowerCase()}.title`)}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {t(`sections.${section.toLowerCase()}.intro`)}
        </p>
      </Card>

      <AnimatePresence mode="wait">
        <motion.div
          key={section}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          {sectionQuestions.map((q, i) => {
            const props = {
              question: q,
              value: answers[q.id],
              onChange: (v: string) => {
                setAnswer(q.id, v);
                setShowIncomplete(false);
              },
              index: i + 1,
            };
            if (q.type === 'mc') return <SjtCard key={q.id} {...props} />;
            if (q.type === 'likert') return <LikertCard key={q.id} {...props} />;
            return <EssayCard key={q.id} {...props} />;
          })}
        </motion.div>
      </AnimatePresence>

      {showIncomplete && (
        <p role="alert" className="rounded-2xl bg-amber-50 p-3 text-sm font-medium text-amber-700">
          {section === 'C' ? t('errors.essayTooShort', { min: ESSAY_MIN_CHARS }) : t('errors.incomplete')}
        </p>
      )}

      {errorMessage && (
        <div role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {errorMessage}
          {err?.code === 'VALIDATION_ERROR' && (
            <Link href="/onboarding" className="ml-2 font-bold underline">
              {t('errors.noSessionCta')}
            </Link>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pb-10">
        {sectionIdx > 0 ? (
          <Button variant="ghost" onClick={goBack}>
            {tc('cta.back')}
          </Button>
        ) : (
          <span />
        )}
        {section !== 'C' ? (
          <Button size="lg" onClick={goNext}>
            {t('nav.next')}
          </Button>
        ) : (
          <Button
            variant="accent"
            size="lg"
            onClick={onSubmit}
            loading={submit.isPending}
          >
            {t('nav.submit')}
          </Button>
        )}
      </div>
    </div>
  );
}
