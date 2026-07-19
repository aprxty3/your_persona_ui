import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DashboardView } from '@/components/features/dashboard/DashboardView';

// M5 — Member dashboard (= USER dashboard, Epic F — NOT an admin dashboard).
// The middleware yp_session gate is UX only; real security is the API's 401.
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4">
      <DashboardView />
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard.meta' });
  return { title: t('title'), robots: { index: false, follow: false } };
}
