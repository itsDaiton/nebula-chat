import { z } from 'zod';

const RANGES = ['7d', '14d', '30d', '90d'] as const;
const AUDIENCES = ['all', 'guests', 'registered'] as const;
const METRICS = ['prompts', 'tokens', 'spend'] as const;

const rangeSchema = z
  .enum(RANGES)
  .default('30d')
  .describe('How many UTC days back, today included; the period before it is the comparison');

const audienceSchema = z
  .enum(AUDIENCES)
  .default('all')
  .describe(
    'Only Guests, only Registered users, or both; calls of a deleted User count under `all` only',
  );

export const usageSeriesQuerySchema = z.object({
  metric: z.enum(METRICS).default('prompts'),
  range: rangeSchema,
  audience: audienceSchema,
  // A key given once arrives as a string, so it is wrapped before the array is checked.
  models: z
    .preprocess(
      (value) => (value === undefined || Array.isArray(value) ? value : [value]),
      z.array(z.string().min(1).max(100)).min(1).max(50).optional(),
    )
    .describe('Only these Model ids, as a repeated key; `run` selects the Run series'),
});

export const usageDetailQuerySchema = z.object({
  model: z.string().min(1).max(100).describe('The Model id'),
  day: z.iso.date().describe('The UTC day, `YYYY-MM-DD`'),
  range: rangeSchema.describe('How many UTC days the trend covers, ending today'),
  audience: audienceSchema,
});

export const usageTotalsQuerySchema = z.object({
  range: rangeSchema,
  audience: audienceSchema,
});

export const usageRunSeriesQuerySchema = z.object({
  range: rangeSchema,
  audience: audienceSchema,
});

export const usageAgentDetailQuerySchema = z.object({
  agent: z.string().min(1).max(100).describe('The Agent name'),
  day: z.iso.date().describe('The UTC day, `YYYY-MM-DD`'),
  range: rangeSchema.describe('How many UTC days the trend covers, ending today'),
  audience: audienceSchema,
});

const memberSchema = z.object({
  key: z.string().describe('A Model id'),
  total: z.number(),
  values: z.array(z.number()).max(90),
});

const seriesSchema = z.object({
  key: z.string().describe('A Model id, `run`, or `other`'),
  kind: z.enum(['model', 'run', 'other']),
  total: z.number().describe('The sum of `values`'),
  values: z.array(z.number()).max(90).describe('One value per day of `days`, zeros included'),
  members: z
    .array(memberSchema)
    .max(200)
    .describe('The Models grouped into `other`, largest first; empty otherwise'),
});

export const usageSeriesSchema = z
  .object({
    metric: z.enum(METRICS),
    range: z.enum(RANGES),
    days: z.array(z.string()).max(90).describe('The UTC days, oldest first, as `YYYY-MM-DD`'),
    series: z
      .array(seriesSchema)
      .max(10)
      .describe('The Run series, the top 8 Models and the rest as `other`, largest first'),
  })
  .meta({ id: 'UsageSeries' });

export const usageDetailSchema = z
  .object({
    model: z.string(),
    day: z.string(),
    prompts: z.number().describe('The Model’s value in the Prompts metric on that day'),
    calls: z.number().describe('Model calls on that day'),
    inputPerCall: z.number().nullable().describe('Input tokens, cached included, per call'),
    outputPerCall: z.number().nullable(),
    costPerCall: z.number().nullable().describe('Estimated USD per call'),
    cacheReplays: z.number().describe('Calls replayed from the response cache'),
    completionRate: z.number().nullable().describe('Completed calls over all calls'),
    avgDurationMs: z.number().nullable(),
    trend: z.array(z.number()).max(90).describe('Prompts per day over the range, oldest first'),
  })
  .meta({ id: 'UsageDetail' });

const RUN_OUTCOMES = ['completed', 'partial', 'failed', 'cancelled'] as const;

const valuesSchema = z
  .array(z.number())
  .max(90)
  .describe('One value per day of `days`, zeros included');

export const usageRunSeriesSchema = z
  .object({
    range: z.enum(RANGES),
    days: z.array(z.string()).max(90).describe('The UTC days, oldest first, as `YYYY-MM-DD`'),
    outcomes: z
      .array(
        z.object({
          outcome: z.enum(RUN_OUTCOMES),
          total: z.number(),
          values: valuesSchema.describe('Runs started that day and ended with this outcome'),
        }),
      )
      .max(4),
    agents: z
      .array(
        z.object({
          key: z.string().describe('An Agent name'),
          spendTotal: z.number().describe('Estimated USD over the range'),
          tokensTotal: z.number(),
          spend: valuesSchema.describe('Estimated USD per day'),
          tokens: valuesSchema.describe('Input and output tokens per day'),
        }),
      )
      .max(50)
      .describe('Agents that made Model calls in Runs, most spend first'),
  })
  .meta({ id: 'UsageRunSeries' });

export const usageAgentDetailSchema = z
  .object({
    agent: z.string(),
    day: z.string(),
    calls: z.number().describe('Model calls on that day'),
    inputPerCall: z.number().nullable().describe('Input tokens, cached included, per call'),
    outputPerCall: z.number().nullable(),
    costPerCall: z.number().nullable().describe('Estimated USD per call'),
    cacheReplays: z.number().describe('Calls replayed from the response cache'),
    completionRate: z.number().nullable().describe('Completed calls over all calls'),
    avgDurationMs: z.number().nullable(),
    trend: z.array(z.number()).max(90).describe('Model calls per day over the range'),
  })
  .meta({ id: 'UsageAgentDetail' });

const averageSchema = z.object({
  value: z.number().nullable().describe('`null` with no Runs'),
  previousValue: z.number().nullable(),
});

const totalSchema = z.object({ total: z.number(), previousTotal: z.number() });

export const usageTotalsSchema = z
  .object({
    range: z.enum(RANGES),
    prompts: totalSchema,
    tokens: totalSchema,
    spend: totalSchema.describe('Estimated USD'),
    activeUsers: totalSchema.describe('Users with a `user` Message in the range'),
    runs: totalSchema,
    runAverages: z
      .object({
        stepsPerRun: averageSchema,
        callsPerRun: averageSchema,
        tokensPerRun: averageSchema,
        costPerRun: averageSchema.describe('Estimated USD'),
        durationMs: averageSchema.describe('Over Runs with a start and a finish'),
      })
      .describe('Per Run, for Runs started in the range'),
    cacheHitRate: z.object({
      rate: z.number().nullable().describe('Cache replays over Model calls; `null` with no calls'),
      previousRate: z.number().nullable(),
    }),
  })
  .meta({ id: 'UsageTotals' });
