'use client';

import { useRef, useState } from 'react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import {
  useForgotPassword,
  useResetPassword,
  useVerifyResetOtp,
} from '@/core/application/useAuth';
import { ApiError } from '@/core/infrastructure/apiClient';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// M5 — forgot/reset password, the deliberate 3-step contract (FR-H4):
// 1. email + Turnstile → ALWAYS a generic 200 (anti-enumeration)
// 2. OTP → short-lived reset_token (single-use on the BE)
// 3. new password + reset_token → auto-login (all old sessions revoked)

type Step = 'email' | 'otp' | 'password';

export function ForgotPasswordFlow() {
  const t = useTranslations('auth.forgot');
  const tc = useTranslations('common');
  const router = useRouter();

  const forgot = useForgotPassword();
  const verifyOtp = useVerifyResetOtp();
  const reset = useResetPassword();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const turnstileRef = useRef<TurnstileInstance>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // ---- Step 1: email ----
  const onSendOtp = () => {
    if (!/.+@.+\..+/.test(email)) {
      setLocalError(t('errors.emailInvalid'));
      return;
    }
    if (!turnstileToken) {
      setLocalError(t('errors.turnstileRequired'));
      return;
    }
    setLocalError(null);
    forgot.mutate(
      { email, cf_turnstile_response: turnstileToken },
      {
        // Generic success ALWAYS (registered or not) — just move to the OTP step.
        onSuccess: () => setStep('otp'),
        onError: (err) => {
          if (err instanceof ApiError && err.code === 'TURNSTILE_VERIFICATION_FAILED') {
            turnstileRef.current?.reset();
            setTurnstileToken(null);
          }
        },
      },
    );
  };

  // ---- Step 2: OTP → reset_token ----
  const onVerifyOtp = () => {
    if (otp.length !== 6) return;
    verifyOtp.mutate(
      { email, otp },
      {
        onSuccess: (res) => {
          setResetToken(res.reset_token);
          setStep('password');
        },
      },
    );
  };

  // ---- Step 3: new password ----
  const onReset = () => {
    if (password.length < 10) {
      setLocalError(t('errors.passwordMin'));
      return;
    }
    if (password !== confirm) {
      setLocalError(t('errors.passwordMismatch'));
      return;
    }
    setLocalError(null);
    reset.mutate(
      { reset_token: resetToken, new_password: password },
      { onSuccess: () => router.push('/dashboard') }, // auto-login from response
    );
  };

  const activeError = forgot.error ?? verifyOtp.error ?? reset.error;
  const errorMessage = (() => {
    if (localError) return localError;
    if (!activeError) return null;
    if (!(activeError instanceof ApiError)) return tc('errors.generic');
    switch (activeError.code) {
      case 'INVALID_OTP':
        return activeError.attemptsRemaining !== undefined
          ? t('errors.invalidOtpWithAttempts', { attempts: activeError.attemptsRemaining })
          : t('errors.invalidOtp');
      case 'OTP_EXPIRED':
        return t('errors.otpExpired');
      case 'OTP_MAX_ATTEMPTS':
        return t('errors.otpMaxAttempts');
      case 'INVALID_TOKEN':
        return t('errors.tokenExpired'); // reset_token dead → restart the flow
      case 'PASSWORD_BREACHED':
        return t('errors.passwordBreached');
      case 'PASSWORD_TOO_SHORT':
        return t('errors.passwordMin');
      case 'TURNSTILE_VERIFICATION_FAILED':
        return t('errors.turnstileFailed');
      case 'RATE_LIMITED':
        return tc('errors.rateLimited', {
          seconds: activeError.retryAfterSeconds ?? 60,
        });
      case 'NETWORK_ERROR':
        return tc('errors.network');
      default:
        return tc('errors.generic');
    }
  })();

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {(['email', 'otp', 'password'] as const).map((s, i) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${
              step === s || (['email', 'otp', 'password'] as const).indexOf(step) > i
                ? 'bg-primary'
                : 'bg-primary-100'
            }`}
          />
        ))}
      </div>

      {step === 'email' && (
        <>
          <p className="text-sm text-slate-600">{t('steps.email.desc')}</p>
          <Input
            label={t('fields.email.label')}
            placeholder={t('fields.email.placeholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
          />
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
          {errorMessage && <ErrorBox message={errorMessage} />}
          <Button size="lg" onClick={onSendOtp} loading={forgot.isPending} className="w-full">
            {t('steps.email.submit')}
          </Button>
        </>
      )}

      {step === 'otp' && (
        <>
          <p className="text-sm text-slate-600">{t('steps.otp.desc', { email })}</p>
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
          {errorMessage && <ErrorBox message={errorMessage} />}
          <Button
            size="lg"
            onClick={onVerifyOtp}
            disabled={otp.length !== 6}
            loading={verifyOtp.isPending}
            className="w-full"
          >
            {t('steps.otp.submit')}
          </Button>
        </>
      )}

      {step === 'password' && (
        <>
          <p className="text-sm text-slate-600">{t('steps.password.desc')}</p>
          <Input
            label={t('fields.newPassword.label')}
            placeholder={t('fields.newPassword.placeholder')}
            help={t('fields.newPassword.help')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
          />
          <Input
            label={t('fields.confirm.label')}
            placeholder={t('fields.confirm.placeholder')}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            type="password"
            autoComplete="new-password"
          />
          {errorMessage && <ErrorBox message={errorMessage} />}
          <Button
            variant="accent"
            size="lg"
            onClick={onReset}
            loading={reset.isPending}
            className="w-full"
          >
            {t('steps.password.submit')}
          </Button>
        </>
      )}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700">
      {message}
    </p>
  );
}
