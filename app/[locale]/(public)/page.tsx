import Image from 'next/image';
import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { LandingAnalytics } from '@/components/features/LandingAnalytics';
import { LocaleSwitcher } from '@/components/features/LocaleSwitcher';

// Landing page — fully SSR for SEO (FR-A1–A4, Epic J). All copy comes from
// the next-intl dictionary; decoration is pure CSS to keep LCP light.

// Hero mascots — deliberately 4 contrasting types (analyst/diplomat/explorer)
// so the collage reads as "many personas". Files live in public/mascots.
const heroMascots = [
  { src: '/mascots/INTJ_style_a.jpeg', alt: 'INTJ mascot', className: 'rotate-[-6deg] animate-float' },
  { src: '/mascots/ENFP_style_b.jpeg', alt: 'ENFP mascot', className: 'rotate-[5deg] translate-y-6 animate-float-slow' },
  { src: '/mascots/ISFP_style_a.jpeg', alt: 'ISFP mascot', className: 'rotate-[-3deg] translate-y-2 animate-float-slow' },
  { src: '/mascots/ENTP_style_b.jpeg', alt: 'ENTP mascot', className: 'rotate-[7deg] animate-float' },
];

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('landing');
  const tc = await getTranslations('common');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: tc('appName'),
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web',
    description: t('meta.description'),
    offers: { '@type': 'Offer', price: '0' },
  };

  const steps = ['one', 'two', 'three'] as const;
  const features = ['mbti', 'grit', 'summary', 'share'] as const;
  const stepTints = ['bg-primary-50', 'bg-secondary-100/40', 'bg-accent-100/50'];

  return (
    <div className="overflow-x-clip">
      {/* FR-J2 — JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={null}>
        <LandingAnalytics />
      </Suspense>

      {/* ---------- Header ---------- */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Link href="/" className="text-xl font-extrabold tracking-tight text-primary-700">
          Your&nbsp;<span className="text-accent">Persona&apos;s</span>
        </Link>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <Link
            href="/auth/login"
            className="hidden rounded-2xl px-4 py-2 text-sm font-bold text-primary-700 hover:bg-primary-50 sm:block"
          >
            {tc('cta.login')}
          </Link>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative mx-auto max-w-6xl px-4 pb-20 pt-10 sm:pt-16">
        {/* decorative blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="blob left-[-10%] top-[-5%] h-72 w-72 bg-primary-100" />
          <div className="blob right-[-8%] top-[20%] h-80 w-80 bg-accent-100" />
          <div className="blob bottom-[-15%] left-[30%] h-64 w-64 bg-secondary-100" />
        </div>

        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <span className="inline-block rounded-full border-2 border-secondary-300 bg-secondary-100/50 px-4 py-1.5 text-sm font-bold text-secondary-700">
              {t('hero.badge')}
            </span>
            <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              {t('hero.titleTop')}{' '}
              <span className="relative inline-block text-accent">
                {t('hero.titleHighlight')}
                <svg
                  aria-hidden
                  viewBox="0 0 200 12"
                  className="absolute -bottom-2 left-0 w-full text-secondary"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M2 9 Q 50 2 100 7 T 198 5"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-slate-600 lg:mx-0">
              {t('hero.subtitle')}
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/onboarding"
                className="inline-flex h-14 items-center justify-center rounded-2xl bg-accent px-8 text-base font-bold text-white shadow-pop transition-all hover:bg-accent-700 active:scale-[0.98]"
              >
                {t('hero.ctaPrimary')} →
              </Link>
              <a
                href="#how"
                className="inline-flex h-14 items-center justify-center rounded-2xl border-2 border-primary-200 bg-white px-8 text-base font-bold text-primary-700 transition-colors hover:border-primary hover:bg-primary-50"
              >
                {t('hero.ctaSecondary')}
              </a>
            </div>
            <p className="mt-4 text-sm text-slate-400">{t('hero.trust')}</p>
          </div>

          {/* Mascot collage */}
          <div className="relative mx-auto grid max-w-md grid-cols-2 gap-4 lg:max-w-none">
            {heroMascots.map((m) => (
              <div
                key={m.src}
                className={`overflow-hidden rounded-3xl border-4 border-white shadow-pop ${m.className}`}
              >
                <Image
                  src={m.src}
                  alt={m.alt}
                  width={280}
                  height={280}
                  className="h-full w-full object-cover"
                  priority={m.src.includes('INTJ')}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Chips */}
        <ul className="mt-14 flex flex-wrap items-center justify-center gap-3">
          {(['mbti', 'grit', 'ai', 'pdf'] as const).map((chip) => (
            <li
              key={chip}
              className="rounded-full border-2 border-primary-100 bg-white px-4 py-2 text-sm font-bold text-primary-700 shadow-soft"
            >
              {t(`chips.${chip}`)}
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="bg-primary-50/60 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-extrabold sm:text-4xl">
            {t('how.title')}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-slate-600">
            {t('how.subtitle')}
          </p>
          <ol className="mt-12 grid gap-6 sm:grid-cols-3">
            {steps.map((step, i) => (
              <li
                key={step}
                className={`rounded-3xl border-2 border-white p-7 shadow-soft ${stepTints[i]}`}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg font-extrabold text-accent shadow-soft">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-xl font-extrabold">
                  {t(`how.steps.${step}.title`)}
                </h3>
                <p className="mt-2 text-slate-600">{t(`how.steps.${step}.desc`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-extrabold sm:text-4xl">
          {t('features.title')}
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f}
              className="group rounded-3xl border-2 border-primary-100 bg-white p-7 shadow-soft transition-all hover:-translate-y-1 hover:shadow-pop"
            >
              <h3 className="text-xl font-extrabold text-primary-700 group-hover:text-accent">
                {t(`features.items.${f}.title`)}
              </h3>
              <p className="mt-2 text-slate-600">{t(`features.items.${f}.desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-secondary-500 to-accent p-10 text-center text-white sm:p-16">
          <div aria-hidden className="absolute -right-10 -top-10 h-48 w-48 animate-blob rounded-full bg-white/10" />
          <div aria-hidden className="absolute -bottom-14 -left-10 h-56 w-56 animate-blob rounded-full bg-white/10" />
          <h2 className="text-3xl font-extrabold sm:text-4xl">{t('finalCta.title')}</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/90">{t('finalCta.subtitle')}</p>
          <Link
            href="/onboarding"
            className="mt-8 inline-flex h-14 items-center justify-center rounded-2xl bg-white px-10 text-base font-extrabold text-accent shadow-pop transition-transform hover:scale-105 active:scale-100"
          >
            {t('finalCta.button')} ✨
          </Link>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t-2 border-primary-50 py-10">
        <div className="mx-auto max-w-6xl space-y-3 px-4 text-center text-sm text-slate-400">
          <p className="mx-auto max-w-2xl">{t('footer.privacy')}</p>
          <p>{t('footer.rights', { year: new Date().getFullYear() })}</p>
        </div>
      </footer>
    </div>
  );
}
