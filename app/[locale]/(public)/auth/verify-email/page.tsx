import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthShell } from '@/components/features/auth/AuthShell';
import { VerifyEmailForm } from '@/components/features/auth/VerifyEmailForm';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.verify.meta' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth.verify');

  return (
    <AuthShell title={t('title')} subtitle={t('subtitle')}>
      <Suspense>
        <VerifyEmailForm />
      </Suspense>
    </AuthShell>
  );
}
