import type { ReactNode } from 'react';
import { Link } from '@/i18n/routing';

// Shared shell for the auth pages (register/verify/forgot — same look as
// login). Server component: pure layout, no client logic.
export function AuthShell({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
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
        <h1 className="text-2xl font-extrabold">{title}</h1>
        <p className="mt-1.5 text-sm text-slate-600">{subtitle}</p>
        <div className="mt-6">{children}</div>
        {footer && <div className="mt-5 text-center text-sm text-slate-500">{footer}</div>}
      </div>
    </main>
  );
}
