import type { z } from 'zod';
import type {
  usageAgentDetailQuerySchema,
  usageDetailQuerySchema,
  usageRunSeriesQuerySchema,
  usageSeriesQuerySchema,
  usageTotalsQuerySchema,
} from '@server/modules/usage/usage.validation';

export type UsageSeriesQuery = z.infer<typeof usageSeriesQuerySchema>;

export type UsageDetailQuery = z.infer<typeof usageDetailQuerySchema>;

export type UsageTotalsQuery = z.infer<typeof usageTotalsQuerySchema>;

export type UsageRunSeriesQuery = z.infer<typeof usageRunSeriesQuerySchema>;

export type UsageAgentDetailQuery = z.infer<typeof usageAgentDetailQuerySchema>;

export type UsageMetric = UsageSeriesQuery['metric'];

export type UsageRange = UsageSeriesQuery['range'];

export type UsageAudience = UsageSeriesQuery['audience'];

export type UsageRow = { day: string; key: string; value: number };

export type UsageAgentRow = { day: string; key: string; spend: number; tokens: number };

export type UsageTotals = {
  prompts: number;
  tokens: number;
  spend: number;
  activeUsers: number;
  runs: number;
  calls: number;
  cacheReplays: number;
  runSteps: number;
  runCalls: number;
  runTokens: number;
  runSpend: number;
  runDurationMs: number | null;
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
