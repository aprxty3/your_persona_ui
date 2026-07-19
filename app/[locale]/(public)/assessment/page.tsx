import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AssessmentForm } from '@/components/features/assessment/AssessmentForm';

// M3 — the assessment engine (Epic B + C). Client logic lives entirely in
// AssessmentForm; this server shell only handles locale + metadata.
export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 pt-6">
      <AssessmentForm />
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'assessment.meta' });
  return { title: t('title'), robots: { index: false, follow: false } };
}
