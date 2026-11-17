import type { z } from 'zod';
import type {
  usageDetailQuerySchema,
  usageSeriesQuerySchema,
  usageTotalsQuerySchema,
} from '@server/modules/usage/usage.validation';

export type UsageSeriesQuery = z.infer<typeof usageSeriesQuerySchema>;

export type UsageDetailQuery = z.infer<typeof usageDetailQuerySchema>;

export type UsageTotalsQuery = z.infer<typeof usageTotalsQuerySchema>;

export type UsageMetric = UsageSeriesQuery['metric'];

export type UsageRange = UsageSeriesQuery['range'];

export type UsageAudience = UsageSeriesQuery['audience'];

export type UsageRow = { day: string; key: string; value: number };

export type UsageTotals = {
  prompts: number;
  tokens: number;
  spend: number;
  activeUsers: number;
  runs: number;
  calls: number;
  cacheReplays: number;
};

export type UsageDayStats = {
  calls: number;
  inputPerCall: number | null;
  outputPerCall: number | null;
  costPerCall: number | null;
  cacheReplays: number;
  completionRate: number | null;
  avgDurationMs: number | null;
};
