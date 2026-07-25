import { describe, expect, test } from 'bun:test';
import {
  CreateGuestSessionRequestSchema,
  CreateGuestSessionResponseSchema,
} from './guestSession';

describe('CreateGuestSessionRequestSchema', () => {
  const valid = {
    display_name: 'Aji',
    age: 17,
    status: 'student',
    locale: 'id',
  } as const;

  test('accepts a valid guest onboarding payload', () => {
    expect(CreateGuestSessionRequestSchema.parse(valid)).toEqual(valid);
  });

  test('rejects age under 13 (FR-A6 age gate mirrors the BE rule)', () => {
    expect(
      CreateGuestSessionRequestSchema.safeParse({ ...valid, age: 12 }).success,
    ).toBe(false);
  });

  test('rejects unknown status and locale values', () => {
    expect(
      CreateGuestSessionRequestSchema.safeParse({ ...valid, status: 'ninja' }).success,
    ).toBe(false);
    expect(
      CreateGuestSessionRequestSchema.safeParse({ ...valid, locale: 'fr' }).success,
    ).toBe(false);
  });
});

describe('CreateGuestSessionResponseSchema — PascalCase is the AS-BUILT contract', () => {
  test('accepts the PascalCase BE response verbatim', () => {
    const pascal = { SessionID: 's1', ExpiresAt: '2026-08-01T00:00:00Z' };
    expect(CreateGuestSessionResponseSchema.parse(pascal)).toEqual(pascal);
  });

  test('rejects a snake_case shape (guard against "cleaning up" without a BE change)', () => {
    const snake = { session_id: 's1', expires_at: '2026-08-01T00:00:00Z' };
    expect(CreateGuestSessionResponseSchema.safeParse(snake).success).toBe(false);
  });
});
