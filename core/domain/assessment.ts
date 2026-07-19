import { z } from 'zod';

// ---------- GET /v1/questions ----------

export const QuestionTypeSchema = z.enum(['mc', 'likert', 'essay_prompt']);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

export const QuestionSchema = z.object({
  id: z.string(),
  section: z.string(),
  type: QuestionTypeSchema,
  display_order: z.number().int(),
  question_text: z.string(),
  // JSON-encoded string for mc/likert, absent for essay_prompt.
  options: z.string().nullish(),
});
export type Question = z.infer<typeof QuestionSchema>;

export const QuestionListSchema = z.array(QuestionSchema);

/**
 * `options` arrives as a JSON-encoded string array (BE contract). Defensive:
 * malformed/absent options → [] so the renderer can show a graceful fallback
 * instead of crashing mid-assessment.
 */
export function parseOptions(q: Question): string[] {
  if (!q.options) return [];
  try {
    const parsed = JSON.parse(q.options);
    return Array.isArray(parsed) ? parsed.filter((o) => typeof o === 'string') : [];
  } catch {
    return [];
  }
}

/** SJT answers are option LETTERS (A..E) — index → letter, per BE scoring. */
export function optionLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

// ---------- POST /v1/assessment/submit ----------

export const AnswerInputSchema = z.object({
  question_id: z.string(),
  value: z.string(),
});
export type AnswerInput = z.infer<typeof AnswerInputSchema>;

export const SubmitRequestSchema = z.object({
  locale: z.string(),
  answers: z.array(AnswerInputSchema).min(1),
});
export type SubmitRequest = z.infer<typeof SubmitRequestSchema>;

// Response 200 — PascalCase is the AS-BUILT contract: the Go dto.SubmitResponse
// has no json tags (see the matching note in guestSession.ts). The results/
// dashboard endpoints ARE snake_case — don't assume one convention for all.
export const SubmitResponseSchema = z.object({
  ResultID: z.string(),
  MBTIType: z.string(),
  GritScore: z.number().int(),
  AISummaryText: z.string(),
  WellbeingFlag: z.boolean(),
  Status: z.string(), // completed | fallback_static
});
export type SubmitResponse = z.infer<typeof SubmitResponseSchema>;

// ---------- GET /v1/results/:id ----------

export const ResultSchema = z.object({
  result_id: z.string(),
  mbti_type: z.string(),
  grit_score: z.number().int(),
  // 5 uppercase keys {EI,SN,TF,JP,GRIT}, values 0-100 = percent leaning to the
  // first pole (E/S/T/J). Optional + defensive: old pre-scoring results can be
  // empty/zero-value (M0 checklist #3).
  trait_scores: z.record(z.string(), z.number()).nullish(),
  ai_summary_text: z.string(),
  status: z.string(),
  wellbeing_flag: z.boolean(),
  mascot_style: z.string(),
  locale: z.string(),
  pdf_status: z.string(),
  is_owner: z.boolean(),
  created_at: z.string(),
});
export type Result = z.infer<typeof ResultSchema>;

export const PdfStatusSchema = z.object({
  pdf_status: z.enum(['pending', 'processing', 'completed', 'failed']),
});
export type PdfStatus = z.infer<typeof PdfStatusSchema>;

// ---------- Qualitative label derivation (PRD Section 3a) ----------
// Any numeric score MUST be accompanied by a label — this helper is the single
// source of truth for the bands.

export type GritBand = 'low' | 'medium' | 'high';

export function gritBand(score: number): GritBand {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}
