import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { AuthShell } from '@/components/features/auth/AuthShell';
import { RegisterForm } from '@/components/features/auth/RegisterForm';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.register.meta' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth.register');

  return (
    <AuthShell
      title={t('title')}
      subtitle={t('subtitle')}
      footer={
        <>
          {t('haveAccount')}{' '}
          <Link href="/auth/login" className="font-bold text-primary-700">
            {t('loginLink')}
          </Link>
        </>
      }
    >
      {/* useSearchParams (claim/ref detection) requires a Suspense boundary */}
      <Suspense>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
