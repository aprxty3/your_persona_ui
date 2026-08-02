import { describe, expect, test } from 'bun:test';
import {
  gritBand,
  optionLetter,
  parseOptions,
  SubmitResponseSchema,
  type Question,
} from './assessment';

const question = (options: string | null | undefined): Question => ({
  id: 'q1',
  section: 'A',
  type: 'mc',
  display_order: 1,
  question_text: 'Q?',
  options,
});

describe('parseOptions — defensive JSON-encoded options (BE contract)', () => {
  test('valid JSON string array parses through', () => {
    expect(parseOptions(question('["Ya","Tidak"]'))).toEqual(['Ya', 'Tidak']);
  });

  test('absent/null options (essay_prompt) → []', () => {
    expect(parseOptions(question(undefined))).toEqual([]);
    expect(parseOptions(question(null))).toEqual([]);
    expect(parseOptions(question(''))).toEqual([]);
  });

  test('malformed JSON → [] (graceful fallback, never throws mid-assessment)', () => {
    expect(parseOptions(question('["broken'))).toEqual([]);
  });

  test('valid JSON but not an array → []', () => {
    expect(parseOptions(question('{"a":1}'))).toEqual([]);
    expect(parseOptions(question('"just a string"'))).toEqual([]);
  });

  test('non-string entries are filtered out, strings kept', () => {
    expect(parseOptions(question('["A", 2, null, "B"]'))).toEqual(['A', 'B']);
  });
});

describe('optionLetter — SJT answers are option LETTERS per BE scoring', () => {
  test('index 0..4 → A..E', () => {
    expect([0, 1, 2, 3, 4].map(optionLetter)).toEqual(['A', 'B', 'C', 'D', 'E']);
  });
});

describe('gritBand — PRD Section 3a bands (Rendah <40 / Sedang 40-69 / Tinggi ≥70)', () => {
  test('boundaries land in the right band', () => {
    expect(gritBand(0)).toBe('low');
    expect(gritBand(39)).toBe('low');
    expect(gritBand(40)).toBe('medium'); // inclusive lower bound
    expect(gritBand(69)).toBe('medium');
    expect(gritBand(70)).toBe('high'); // inclusive lower bound
    expect(gritBand(100)).toBe('high');
  });
});

describe('SubmitResponseSchema — PascalCase is the AS-BUILT contract', () => {
  const pascal = {
    ResultID: 'r1',
    MBTIType: 'INTJ',
    GritScore: 72,
    AISummaryText: 'ok',
    WellbeingFlag: false,
    Status: 'completed',
  };

  test('accepts the PascalCase BE response verbatim', () => {
    expect(SubmitResponseSchema.parse(pascal)).toEqual(pascal);
  });

  test('rejects a snake_case shape (guard against "cleaning up" the schema without a BE change)', () => {
    const snake = {
      result_id: 'r1',
      mbti_type: 'INTJ',
      grit_score: 72,
      ai_summary_text: 'ok',
      wellbeing_flag: false,
      status: 'completed',
    };
    expect(SubmitResponseSchema.safeParse(snake).success).toBe(false);
  });
});
