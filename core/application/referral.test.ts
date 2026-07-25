import { beforeEach, describe, expect, test } from 'bun:test';

// bun:test has no DOM — referral.ts reads window.localStorage at call time.
const localStore = new Map<string, string>();
const windowStub = {
  localStorage: {
    getItem: (k: string) => localStore.get(k) ?? null,
    setItem: (k: string, v: string) => void localStore.set(k, v),
    removeItem: (k: string) => void localStore.delete(k),
  },
};
(globalThis as Record<string, unknown>).window = windowStub;

const { captureReferralCode, consumeReferralCode } = await import('./referral');

beforeEach(() => {
  // Other test files swap globalThis.window — re-install ours per test so the
  // suite stays order-independent.
  (globalThis as Record<string, unknown>).window = windowStub;
  localStore.clear();
});

describe('captureReferralCode (?ref= → localStorage, dipakai saat register M5)', () => {
  test('stores a trimmed ref code', () => {
    captureReferralCode(new URLSearchParams('?ref=%20ABC123%20'));
    expect(consumeReferralCode()).toBe('ABC123');
  });

  test('no ref param / empty ref → nothing stored, existing value untouched', () => {
    captureReferralCode(new URLSearchParams('?ref=KEEP'));
    captureReferralCode(new URLSearchParams('?utm=x'));
    captureReferralCode(new URLSearchParams('?ref='));
    expect(consumeReferralCode()).toBe('KEEP');
  });

  test('a later ref overwrites the earlier one (last click wins)', () => {
    captureReferralCode(new URLSearchParams('?ref=FIRST'));
    captureReferralCode(new URLSearchParams('?ref=SECOND'));
    expect(consumeReferralCode()).toBe('SECOND');
  });
});

describe('consumeReferralCode', () => {
  test('returns null when nothing was captured', () => {
    expect(consumeReferralCode()).toBeNull();
  });

  test('is one-shot: the code is removed after being consumed', () => {
    captureReferralCode(new URLSearchParams('?ref=ONCE'));
    expect(consumeReferralCode()).toBe('ONCE');
    expect(consumeReferralCode()).toBeNull();
  });
});
