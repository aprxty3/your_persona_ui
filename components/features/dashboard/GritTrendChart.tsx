'use client';

import { useTranslations } from 'next-intl';
import type { GritTrendPoint } from '@/core/domain/dashboard';
import { gritBand } from '@/core/domain/assessment';

// FR-F3 — GRIT trend. Hand-rolled SVG line chart: one small graph doesn't
// justify a chart library (Tech Doc §2). Defensive: pre-scoring rows carry
// grit_score 0 — they're plotted but flagged, and <2 points = no line.

const W = 320;
const H = 120;
const PAD = 16;

export function GritTrendChart({ points }: { points: GritTrendPoint[] }) {
  const t = useTranslations('dashboard.trend');

  if (points.length === 0) {
    return <p className="text-sm text-slate-500">{t('empty')}</p>;
  }

  // Oldest → newest left-to-right regardless of API ordering.
  const sorted = [...points].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const latest = sorted[sorted.length - 1];

  const x = (i: number) =>
    sorted.length === 1
      ? W / 2
      : PAD + (i * (W - 2 * PAD)) / (sorted.length - 1);
  const y = (score: number) => H - PAD - (score / 100) * (H - 2 * PAD);

  const path = sorted
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.grit_score)}`)
    .join(' ');

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={t('ariaLabel')}
        className="w-full"
      >
        {/* Band guides at 40 / 70 (Rendah <40, Sedang 40-69, Tinggi ≥70) */}
        {[40, 70].map((v) => (
          <line
            key={v}
            x1={PAD}
            x2={W - PAD}
            y1={y(v)}
            y2={y(v)}
            stroke="#D0F1F4"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        ))}
        {sorted.length > 1 && (
          <path d={path} fill="none" stroke="#0E9AA8" strokeWidth={2.5} strokeLinecap="round" />
        )}
        {sorted.map((p, i) => (
          <circle
            key={p.result_id}
            cx={x(i)}
            cy={y(p.grit_score)}
            r={i === sorted.length - 1 ? 5 : 3.5}
            fill={i === sorted.length - 1 ? '#9333EA' : '#14B8A6'}
          />
        ))}
      </svg>
      {latest && latest.grit_score > 0 && (
        <p className="mt-1 text-center text-xs font-medium text-slate-500">
          {t('latest', {
            score: latest.grit_score,
            band: t(`band.${gritBand(latest.grit_score)}`),
          })}
        </p>
      )}
    </div>
  );
}
