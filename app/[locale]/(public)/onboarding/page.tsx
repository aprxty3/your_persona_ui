import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { OnboardingForm } from '@/components/features/OnboardingForm';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'onboarding.meta' });
  return { title: t('title') };
}

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('onboarding');
  const tc = await getTranslations('common');

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-8">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="blob right-[-20%] top-[-5%] h-64 w-64 bg-secondary-100" />
        <div className="blob bottom-[10%] left-[-25%] h-72 w-72 bg-accent-100" />
      </div>

      <Link href="/" className="text-sm font-bold text-primary-700 hover:underline">
        ← {tc('cta.back')}
      </Link>

      <div className="mt-8">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t('title')}
        </h1>
        <p className="mt-2 text-slate-600">{t('subtitle')}</p>
      </div>

      <div className="mt-8">
        <OnboardingForm />
      </div>
    </main>
  );
}
