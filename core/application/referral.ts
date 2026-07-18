// Capture ?ref=CODE on the landing page → localStorage → used as
// `referral_code` in the register payload (M5). Without this, FR-G1 never
// works from the FE side (Tech Doc §6.3).

const REF_KEY = 'yp_ref';

export function captureReferralCode(searchParams: URLSearchParams): void {
  const ref = searchParams.get('ref')?.trim();
  if (ref) window.localStorage.setItem(REF_KEY, ref);
}

export function consumeReferralCode(): string | null {
  const ref = window.localStorage.getItem(REF_KEY);
  window.localStorage.removeItem(REF_KEY);
  return ref;
}
