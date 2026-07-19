'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

// M3 — Waiting Room (FR-C1). The submit request itself is the wait: Gemini
// runs synchronously on the BE (3-8s by design), so this overlay lives for
// exactly as long as the real response takes — no fake fixed timer.

const LINE_COUNT = 4;
const LINE_INTERVAL_MS = 2600;

export function WaitingRoom() {
  const t = useTranslations('assessment.waiting');
  const [lineIdx, setLineIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setLineIdx((i) => (i + 1) % LINE_COUNT),
      LINE_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 px-6 text-center backdrop-blur-sm"
    >
      {/* Morphing blob — matches the landing hero's kidcore look */}
      <motion.div
        aria-hidden
        className="h-28 w-28 bg-gradient-to-br from-primary-300 via-secondary-300 to-accent-300"
        animate={{
          borderRadius: [
            '58% 42% 55% 45% / 45% 58% 42% 55%',
            '45% 55% 42% 58% / 55% 45% 58% 42%',
            '58% 42% 55% 45% / 45% 58% 42% 55%',
          ],
          scale: [1, 1.08, 1],
          rotate: [0, 8, 0],
        }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <h2 className="mt-8 text-xl font-extrabold text-slate-800">{t('title')}</h2>
      <div className="mt-3 h-12">
        <AnimatePresence mode="wait">
          <motion.p
            key={lineIdx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="text-sm font-medium text-slate-500"
          >
            {t(`lines.${lineIdx}`)}
          </motion.p>
        </AnimatePresence>
      </div>
      <p className="mt-6 text-xs text-slate-400">{t('note')}</p>
    </div>
  );
}
