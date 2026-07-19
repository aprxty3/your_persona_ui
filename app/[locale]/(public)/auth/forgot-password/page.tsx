import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { AuthShell } from '@/components/features/auth/AuthShell';
import { ForgotPasswordFlow } from '@/components/features/auth/ForgotPasswordFlow';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.forgot.meta' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth.forgot');

  return (
    <AuthShell
      title={t('title')}
      subtitle={t('subtitle')}
      footer={
        <Link href="/auth/login" className="font-bold text-primary-700">
          {t('backToLogin')}
        </Link>
      }
    >
      <ForgotPasswordFlow />
    </AuthShell>
  );
}
