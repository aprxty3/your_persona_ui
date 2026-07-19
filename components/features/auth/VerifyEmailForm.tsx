'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { useResendEmailOtp, useVerifyEmailOtp } from '@/core/application/useAuth';
import { ApiError } from '@/core/infrastructure/apiClient';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// M5 — verify email OTP (FR-H2). Success = auto-login (tokens come straight
// back) → dashboard. Resend has a 60s/email cooldown mirrored client-side.

const RESEND_COOLDOWN_S = 60;

export function VerifyEmailForm() {
  const t = useTranslations('auth.verify');
  const tc = useTranslations('common');
  const router = useRouter();
  const email = useSearchParams().get('email') ?? '';

  const verify = useVerifyEmailOtp();
  const resend = useResendEmailOtp();
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const onVerify = () => {
    if (otp.length !== 6) return;
    verify.mutate(
      { email, otp },
      { onSuccess: () => router.push('/dashboard') },
    );
  };

  const onResend = () => {
    resend.mutate(email, {
      onSuccess: () => setCooldown(RESEND_COOLDOWN_S),
      onError: (err) => {
        // BE cooldown is authoritative — mirror its retry_after when rate-limited.
        if (err instanceof ApiError && err.code === 'RATE_LIMITED') {
          setCooldown(err.retryAfterSeconds ?? RESEND_COOLDOWN_S);
        }
      },
    });
  };

  const err = verify.error;
  const errorMessage = (() => {
    if (!err) return null;
    if (!(err instanceof ApiError)) return tc('errors.generic');
    switch (err.code) {
      case 'INVALID_OTP':
        return err.attemptsRemaining !== undefined
          ? t('errors.invalidOtpWithAttempts', { attempts: err.attemptsRemaining })
          : t('errors.invalidOtp');
      case 'OTP_EXPIRED':
        return t('errors.otpExpired');
      case 'OTP_MAX_ATTEMPTS':
        return t('errors.otpMaxAttempts');
      case 'NETWORK_ERROR':
        return tc('errors.network');
      default:
        return tc('errors.generic');
    }
  })();

  if (!email) {
    // Direct visit without the email param — nothing to verify against.
    return (
      <p className="rounded-2xl bg-amber-50 p-3 text-sm font-medium text-amber-700">
        {t('missingEmail')}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">{t('sentTo', { email })}</p>

      <Input
        label={t('fields.otp.label')}
        placeholder="000000"
        value={otp}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        className="text-center text-2xl font-bold tracking-[0.5em]"
      />

      {errorMessage && (
        <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {errorMessage}
        </p>
      )}

      <Button
        size="lg"
        onClick={onVerify}
        disabled={otp.length !== 6}
        loading={verify.isPending}
        className="w-full"
      >
        {verify.isPending ? tc('cta.submitting') : t('submit')}
      </Button>

      <div className="text-center text-sm text-slate-500">
        {cooldown > 0 ? (
          <span>{t('resendCooldown', { seconds: cooldown })}</span>
        ) : (
          <button
            type="button"
            onClick={onResend}
            disabled={resend.isPending}
            className="font-bold text-primary-700 underline disabled:opacity-50"
          >
            {t('resend')}
          </button>
        )}
      </div>
    </div>
  );
}
