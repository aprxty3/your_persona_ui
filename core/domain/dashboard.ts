import { z } from 'zod';

// GET /v1/user-dashboard (fully consumed in M5 — schema prepared since M1 per
// the checklist so the contract is locked once in core/domain).

export const GritTrendPointSchema = z.object({
  result_id: z.string(),
  grit_score: z.number().int(),
  created_at: z.string(),
});
export type GritTrendPoint = z.infer<typeof GritTrendPointSchema>;

export const DashboardResponseSchema = z.object({
  quota_limit: z.number().int(),
  quota_used: z.number().int(),
  quota_remaining: z.number().int(),
  grit_trend: z.array(GritTrendPointSchema),
  latest_mbti_type: z.string().nullish(),
  // Already locale-aware from the BE — render as-is; [] = hide the section.
  micro_insights: z.array(z.string()),
});
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;

// GET /v1/user-dashboard/history
export const HistoryItemSchema = z.object({
  result_id: z.string(),
  mbti_type: z.string(),
  status: z.string(),
  created_at: z.string(),
});
export type HistoryItem = z.infer<typeof HistoryItemSchema>;

export const PaginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  total_pages: z.number().int(),
});
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;
