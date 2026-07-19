import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ResultView } from '@/components/features/result/ResultView';

// M4 — Grand Reveal page. Data fetching is client-side (ResultView) because
// ownership depends on browser credentials (session_id cookie / bearer token)
// that a server render here wouldn't carry.

type Params = { locale: string; id: string };

export default async function ResultPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4">
      <ResultView resultId={id} />
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'results.meta' });

  return {
    title: t('title'),
    // FR-D9: second layer on top of the BE's X-Robots-Tag header.
    robots: { index: false, follow: false },
    openGraph: {
      title: t('title'),
      // 9:16 share card (FR-D5) — rendered by our own OG route, zero Gemini cost.
      images: [{ url: `/api/og?id=${encodeURIComponent(id)}`, width: 1080, height: 1920 }],
    },
  };
}
