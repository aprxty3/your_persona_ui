'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useCreateGuestSession } from '@/core/application/useGuestSession';
import { track } from '@/core/infrastructure/analytics';
import { ApiError } from '@/core/infrastructure/apiClient';
import { GuestStatusSchema, LocaleSchema } from '@/core/domain/guestSession';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// FR-A5–A7: onboarding form + microcopy + age 13+ checkbox & privacy notice.
// NO Turnstile widget — the BE deliberately does not validate it on
// /guest-session (§5.3); protection there is per-IP rate limiting + per-session quota.

const statusOptions = GuestStatusSchema.options;

export function OnboardingForm() {
  const t = useTranslations('onboarding');
  const tc = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const mutation = useCreateGuestSession();
  const startedTracked = useRef(false);

  // Form schema — error messages come from the dictionary (never hardcoded).
  const FormSchema = z.object({
    display_name: z.string().trim().min(1, t('errors.displayNameRequired')),
    age: z.coerce
      .number({ message: t('errors.ageRequired') })
      .int()
      .min(13, t('errors.ageMin')),
    status: GuestStatusSchema,
    consent: z.literal(true, {
      errorMap: () => ({ message: t('errors.consentRequired') }),
    }),
  });
  type FormValues = z.infer<typeof FormSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { status: 'student' },
  });

  useEffect(() => {
    if (!startedTracked.current) {
      track('onboarding_started');
      startedTracked.current = true;
    }
  }, []);

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(
      {
        display_name: values.display_name,
        age: values.age,
        status: values.status,
        locale: LocaleSchema.parse(locale),
      },
      // Success → ready for the questions (M3). onboarding_completed fires in the hook.
      { onSuccess: () => router.push('/assessment') },
    );
  });

  const apiError = mutation.error;
  const errorMessage =
    apiError instanceof ApiError
      ? apiError.code === 'RATE_LIMITED'
        ? t('rateLimited', { seconds: apiError.retryAfterSeconds ?? 60 })
        : apiError.code === 'NETWORK_ERROR'
          ? tc('errors.network')
          : tc('errors.generic')
      : apiError
        ? tc('errors.generic')
        : null;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Input
        label={t('fields.displayName.label')}
        placeholder={t('fields.displayName.placeholder')}
        help={t('fields.displayName.help')}
        error={errors.display_name?.message}
        autoComplete="nickname"
        {...register('display_name')}
      />

      <Input
        label={t('fields.age.label')}
        placeholder={t('fields.age.placeholder')}
        help={t('fields.age.help')}
        error={errors.age?.message}
        type="number"
        inputMode="numeric"
        min={13}
        {...register('age')}
      />

      <fieldset>
        <legend className="mb-2 block text-sm font-bold text-slate-800">
          {t('fields.status.label')}
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {statusOptions.map((status) => (
            <label
              key={status}
              className="flex cursor-pointer items-center justify-center rounded-2xl border-2 border-primary-100 bg-white px-3 py-3 text-center text-sm font-bold text-slate-600 transition-colors hover:border-primary-300 has-[:checked]:border-primary has-[:checked]:bg-primary-50 has-[:checked]:text-primary-700"
            >
              <input
                type="radio"
                value={status}
                className="sr-only"
                {...register('status')}
              />
              {t(`fields.status.options.${status}`)}
            </label>
          ))}
        </div>
        {errors.status && (
          <p className="mt-1.5 text-sm font-medium text-red-600">
            {t('errors.statusRequired')}
          </p>
        )}
      </fieldset>

      <div className="rounded-2xl border-2 border-secondary-100 bg-secondary-100/30 p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 shrink-0 accent-primary"
            {...register('consent')}
          />
          <span className="text-sm font-medium text-slate-700">
            {t('fields.consent.label')}
          </span>
        </label>
        <p className="mt-2 pl-8 text-xs text-slate-500">
          {t('fields.consent.privacy')}
        </p>
        {errors.consent && (
          <p className="mt-1.5 pl-8 text-sm font-medium text-red-600">
            {errors.consent.message}
          </p>
        )}
      </div>

      {errorMessage && (
        <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {errorMessage}
        </p>
      )}

      <Button type="submit" variant="accent" size="lg" loading={mutation.isPending} className="w-full">
        {mutation.isPending ? tc('cta.submitting') : t('submit')}
      </Button>
    </form>
  );
}
