import { beforeEach, describe, expect, test } from 'bun:test';

// zustand/persist reaches for localStorage at create time — stub it before the
// store module loads (bun:test has no DOM).
const store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

const { useAssessmentStore } = await import('./assessmentStore');

describe('ensureIdempotencyKey (§4.2)', () => {
  beforeEach(() => {
    useAssessmentStore.getState().resetAll();
  });

  test('identical payload on retry reuses the SAME key', () => {
    const payload = JSON.stringify({ answers: { q1: 'A' } });
    const first = useAssessmentStore.getState().ensureIdempotencyKey(payload);
    const retry = useAssessmentStore.getState().ensureIdempotencyKey(payload);
    expect(retry).toBe(first);
  });

  test('changed payload mints a NEW key (old key + new payload = 409 on the BE)', () => {
    const first = useAssessmentStore
      .getState()
      .ensureIdempotencyKey(JSON.stringify({ answers: { q1: 'A' } }));
    const second = useAssessmentStore
      .getState()
      .ensureIdempotencyKey(JSON.stringify({ answers: { q1: 'B' } }));
    expect(second).not.toBe(first);
  });

  test('clearAfterSuccess drops the key so the next submit starts fresh', () => {
    const payload = JSON.stringify({ answers: { q1: 'A' } });
    const first = useAssessmentStore.getState().ensureIdempotencyKey(payload);
    useAssessmentStore.getState().clearAfterSuccess();
    const next = useAssessmentStore.getState().ensureIdempotencyKey(payload);
    expect(next).not.toBe(first);
  });
});
