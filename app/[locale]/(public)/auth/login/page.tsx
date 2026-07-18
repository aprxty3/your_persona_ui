import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { LoginForm } from '@/components/features/LoginForm';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.login.meta' });
  // /auth is disallowed in robots.ts; noindex is the second layer.
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth.login');
  const tc = await getTranslations('common');

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="blob left-[-25%] top-[5%] h-64 w-64 bg-primary-100" />
        <div className="blob bottom-[5%] right-[-25%] h-72 w-72 bg-accent-100" />
      </div>

      <Link href="/" className="mb-8 text-center text-xl font-extrabold text-primary-700">
        Your <span className="text-accent">Persona&apos;s</span>
      </Link>

      <div className="rounded-3xl border-2 border-primary-100 bg-white p-7 shadow-soft sm:p-9">
        <h1 className="text-2xl font-extrabold">{t('title')}</h1>
        <p className="mt-1.5 text-sm text-slate-600">{t('subtitle')}</p>

        <div className="mt-6">
          <LoginForm />
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          {t('noAccount')}{' '}
          {/* M5: register page — links stubbed so the IA is visible */}
          <span className="font-bold text-primary-700">{t('registerLink')}</span>
          {' · '}
          <span className="font-bold text-primary-700">{t('forgotLink')}</span>
        </p>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">{tc('tagline')}</p>
    </main>
  );
}
