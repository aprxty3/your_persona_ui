'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { useRegister } from '@/core/application/useAuth';
import { consumeReferralCode } from '@/core/application/referral';
import { ApiError } from '@/core/infrastructure/apiClient';
import { LocaleSchema } from '@/core/domain/guestSession';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// M5 — register (FR-H1). display_name/age/status are NOT asked here: with a
// live guest session cookie the BE copies them from GUEST_SESSION (the claim
// flow); without one, they're filled later via PATCH /account/profile.
// referral_code comes silently from localStorage (?ref= capture at landing).

export function RegisterForm() {
  const t = useTranslations('auth.register');
  const tc = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const registerMutation = useRegister();

  const turnstileRef = useRef<TurnstileInstance>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState<string | null>(null);

  const FormSchema = z
    .object({
      email: z.string().email(t('errors.emailInvalid')),
      password: z.string().min(10, t('errors.passwordMin')),
      confirm: z.string(),
    })
    .refine((v) => v.password === v.confirm, {
      path: ['confirm'],
      message: t('errors.passwordMismatch'),
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

    registerMutation.mutate(
      {
        email: values.email,
        password: values.password,
        preferred_locale: LocaleSchema.parse(locale),
        referral_code: consumeReferralCode(), // BE treats null/"" as "none"
        cf_turnstile_response: turnstileToken,
        fromClaim: searchParams.get('from') === 'claim',
      },
      {
        onSuccess: () =>
          router.push(`/auth/verify-email?email=${encodeURIComponent(values.email)}`),
        onError: (err) => {
          if (
            err instanceof ApiError &&
            err.code === 'TURNSTILE_VERIFICATION_FAILED'
          ) {
            turnstileRef.current?.reset(); // §5.3 — input is KEPT
            setTurnstileToken(null);
          }
        },
      },
    );
  });

  const err = registerMutation.error;
  const errorMessage = (() => {
    if (!err) return null;
    if (!(err instanceof ApiError)) return tc('errors.generic');
    switch (err.code) {
      case 'EMAIL_ALREADY_REGISTERED':
        return t('errors.emailTaken');
      case 'PASSWORD_TOO_SHORT':
        return t('errors.passwordMin');
      case 'PASSWORD_BREACHED':
        return t('errors.passwordBreached');
      case 'TURNSTILE_VERIFICATION_FAILED':
        return t('errors.turnstileFailed');
      case 'RATE_LIMITED':
        return tc('errors.rateLimited', { seconds: err.retryAfterSeconds ?? 60 });
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
        help={t('fields.password.help')}
        error={errors.password?.message}
        type="password"
        autoComplete="new-password"
        {...register('password')}
      />

      <Input
        label={t('fields.confirm.label')}
        placeholder={t('fields.confirm.placeholder')}
        error={errors.confirm?.message}
        type="password"
        autoComplete="new-password"
        {...register('confirm')}
      />

      <div className="space-y-1.5">
        <Turnstile
          ref={turnstileRef}
          siteKey={
            process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ??
            '1x00000000000000000000AA'
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

      <Button
        type="submit"
        variant="accent"
        size="lg"
        loading={registerMutation.isPending}
        className="w-full"
      >
        {registerMutation.isPending ? tc('cta.submitting') : t('submit')}
      </Button>
    </form>
  );
}
