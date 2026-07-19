'use client';

import { useTranslations } from 'next-intl';
import { parseOptions, optionLetter, type Question } from '@/core/domain/assessment';
import { Card } from '@/components/ui/Card';

// M3 — one renderer per question type (FR-B1–B4). Values follow the BE
// scoring contract exactly: SJT = option LETTER ("A".."E"), Likert = "1".."5"
// (string), essay = raw text. Option labels are locale-aware from the BE.

type InputProps = {
  question: Question;
  value: string | undefined;
  onChange: (value: string) => void;
  index: number; // 1-based number within the section, for display
};

export function SjtCard({ question, value, onChange, index }: InputProps) {
  const options = parseOptions(question);
  return (
    <Card>
      <p className="font-bold text-slate-800">
        <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-sm text-primary-700">
          {index}
        </span>
        {question.question_text}
      </p>
      <div className="mt-4 space-y-2">
        {options.map((label, i) => {
          const letter = optionLetter(i);
          const selected = value === letter;
          return (
            <label
              key={letter}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 px-4 py-3 text-sm font-medium transition-colors ${
                selected
                  ? 'border-primary bg-primary-50 text-primary-700'
                  : 'border-primary-100 bg-white text-slate-600 hover:border-primary-300'
              }`}
            >
              <input
                type="radio"
                name={question.id}
                value={letter}
                checked={selected}
                onChange={() => onChange(letter)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  selected ? 'bg-primary text-white' : 'bg-primary-100 text-primary-700'
                }`}
              >
                {letter}
              </span>
              {label}
            </label>
          );
        })}
      </div>
    </Card>
  );
}

export function LikertCard({ question, value, onChange, index }: InputProps) {
  const labels = parseOptions(question); // 5 locale-aware labels from the BE
  return (
    <Card>
      <p className="font-bold text-slate-800">
        <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-secondary-100 text-sm text-secondary-700">
          {index}
        </span>
        {question.question_text}
      </p>
      <div
        role="radiogroup"
        aria-label={question.question_text}
        className="mt-4 grid grid-cols-5 gap-1.5"
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const v = String(n);
          const selected = value === v;
          return (
            <label
              key={n}
              className={`flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 px-1 py-2.5 transition-colors ${
                selected
                  ? 'border-secondary bg-secondary-100/60'
                  : 'border-primary-100 bg-white hover:border-secondary-300'
              }`}
            >
              <input
                type="radio"
                name={question.id}
                value={v}
                checked={selected}
                onChange={() => onChange(v)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  selected ? 'bg-secondary-500 text-white' : 'bg-primary-50 text-slate-500'
                }`}
              >
                {n}
              </span>
              <span className="text-center text-[10px] font-medium leading-tight text-slate-500">
                {labels[n - 1] ?? ''}
              </span>
            </label>
          );
        })}
      </div>
    </Card>
  );
}

// Encouraging counter thresholds (FR-B3/B4): copy never scolds — targets
// drop-off ≤35% in Section C. The BE's garbage filter kicks in below 30 chars;
// the client mirrors that as a soft minimum (server stays authoritative).
export const ESSAY_MIN_CHARS = 30;
export const ESSAY_MAX_CHARS = 4000; // BE hard cap per answer

export function EssayCard({ question, value, onChange, index }: InputProps) {
  const t = useTranslations('assessment.essay');
  const text = value ?? '';
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  const reachedMin = text.trim().length >= ESSAY_MIN_CHARS;

  return (
    <Card tint="secondary">
      <p className="font-bold text-slate-800">
        <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-100 text-sm text-accent-700">
          {index}
        </span>
        {question.question_text}
      </p>
      <p className="mt-2 text-xs text-slate-500">{t('guardrail')}</p>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value.slice(0, ESSAY_MAX_CHARS))}
        rows={6}
        placeholder={t('placeholder')}
        className="mt-3 w-full resize-y rounded-2xl border-2 border-primary-100 bg-white p-4 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-primary"
      />
      <div className="mt-1.5 flex items-center justify-between text-xs font-medium">
        <span className={reachedMin ? 'text-secondary-700' : 'text-slate-400'}>
          {reachedMin ? t('counterOk', { words }) : t('counterStart', { words })}
        </span>
        <span className="text-slate-400">{text.length}/{ESSAY_MAX_CHARS}</span>
      </div>
    </Card>
  );
}
