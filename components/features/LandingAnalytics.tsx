'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { track } from '@/core/infrastructure/analytics';
import { captureReferralCode } from '@/core/application/referral';

// Small client island on the landing page (the page itself stays SSR): fire
// `landing_view` once + capture ?ref=CODE → localStorage for M5 register (§6.3).
export function LandingAnalytics() {
  const searchParams = useSearchParams();

  useEffect(() => {
    track('landing_view');
    captureReferralCode(new URLSearchParams(searchParams.toString()));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount
  }, []);

  return null;
}
