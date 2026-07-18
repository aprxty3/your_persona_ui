'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useLogin } from '@/core/application/useAuth';
import { ApiError } from '@/core/infrastructure/apiClient';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// AUTH MENU IMPLEMENTATION EXAMPLE (login) — template for register/forgot in M5.
// Patterns demonstrated here:
// 1. Turnstile (§5.3): widget token → `cf_turnstile_response` field;
//    TURNSTILE_VERIFICATION_FAILED → reset the widget, FORM INPUT IS KEPT.
// 2. §9 error mapping: INVALID_CREDENTIALS / EMAIL_NOT_VERIFIED /
//    ACCOUNT_LOCKED (423) / RATE_LIMITED per code, not one generic message.
// 3. Token pair → authStore (access in-memory, refresh localStorage) via hook.

export function LoginForm() {
  const t = useTranslations('auth.login');
  const tc = useTranslations('common');
  const router = useRouter();
  const login = useLogin();

  const turnstileRef = useRef<TurnstileInstance>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState<string | null>(null);

  const FormSchema = z.object({
    email: z.string().email(t('errors.emailInvalid')),
    password: z.string().min(1, t('errors.passwordRequired')),
  });
  type FormValues = z.infer<typeof FormSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(FormSchema) });

  const onSubmit = handleSubmit((values) => {
    if (!turnstileToken) {
      setTurnstileError(t('errors.turnstileRequired'));
      return;
    }
    setTurnstileError(null);

    login.mutate(
      { ...values, cf_turnstile_response: turnstileToken },
      {
        onSuccess: () => router.push('/'), // M5: change to /dashboard
        onError: (err) => {
          if (
            err instanceof ApiError &&
            err.code === 'TURNSTILE_VERIFICATION_FAILED'
          ) {
            // §5.3 — the challenge is repeated, form input is NOT cleared.
            turnstileRef.current?.reset();
            setTurnstileToken(null);
          }
        },
      },
    );
  });

  const err = login.error;
  const errorMessage = (() => {
    if (!err) return null;
    if (!(err instanceof ApiError)) return tc('errors.generic');
    switch (err.code) {
      case 'INVALID_CREDENTIALS':
        return t('errors.invalidCredentials');
      case 'EMAIL_NOT_VERIFIED':
        return t('errors.emailNotVerified'); // M5: redirect to the OTP page
      case 'ACCOUNT_LOCKED':
        return t('errors.accountLocked');
      case 'TURNSTILE_VERIFICATION_FAILED':
        return t('errors.turnstileFailed');
      case 'RATE_LIMITED':
        return tc('errors.rateLimited', { seconds: err.retryAfterSeconds ?? 60 });
      case 'SERVICE_UNAVAILABLE':
        return tc('errors.serviceUnavailable');
      case 'NETWORK_ERROR':
        return tc('errors.network');
      default:
        return tc('errors.generic');
    }
  })();

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Input
        label={t('fields.email.label')}
        placeholder={t('fields.email.placeholder')}
        error={errors.email?.message}
        type="email"
        autoComplete="email"
        {...register('email')}
      />

      <Input
        label={t('fields.password.label')}
        placeholder={t('fields.password.placeholder')}
        error={errors.password?.message}
        type="password"
        autoComplete="current-password"
        {...register('password')}
      />

      <div className="space-y-1.5">
        <Turnstile
          ref={turnstileRef}
          siteKey={
            process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ??
            '1x00000000000000000000AA' // Cloudflare test sitekey — always passes (dev)
          }
          onSuccess={setTurnstileToken}
          onExpire={() => setTurnstileToken(null)}
          options={{ size: 'flexible' }}
        />
        {turnstileError && (
          <p className="text-sm font-medium text-red-600">{turnstileError}</p>
        )}
      </div>

      {errorMessage && (
        <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {errorMessage}
        </p>
      )}

      <Button type="submit" size="lg" loading={login.isPending} className="w-full">
        {login.isPending ? tc('cta.submitting') : t('submit')}
      </Button>
    </form>
  );
}
