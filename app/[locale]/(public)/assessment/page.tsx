import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';

// M3 placeholder — the M2 DoD only goes up to "ready to enter the questions";
// this page exists so the post-onboarding redirect doesn't 404. The test
// engine is the next milestone.
export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('assessment.comingSoon');
  const tc = await getTranslations('common');

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-4 text-center">
      <div className="rounded-3xl border-2 border-primary-100 bg-primary-50 p-10 shadow-soft">
        <h1 className="text-2xl font-extrabold">{t('title')}</h1>
        <p className="mt-3 text-slate-600">{t('desc')}</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-2xl bg-primary px-6 py-3 font-bold text-white shadow-soft hover:bg-primary-600"
        >
          {tc('cta.back')}
        </Link>
      </div>
    </main>
  );
}
