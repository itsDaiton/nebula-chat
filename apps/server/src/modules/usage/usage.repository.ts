import { sql } from 'drizzle-orm';
import { db } from '@server/db';
import type {
  UsageAudience,
  UsageDayStats,
  UsageMetric,
  UsageRow,
  UsageTotals,
} from '@server/modules/usage/usage.types';

// Days are UTC `YYYY-MM-DD`, both ends inclusive; the timestamp columns hold UTC.
const between = (column: ReturnType<typeof sql.raw>, from: string, to: string) =>
  sql`${column} >= ${from}::timestamp and ${column} < (${to}::date + 1)::timestamp`;

const audienceFilter = (audience: UsageAudience) => {
  if (audience === 'guests') return sql`u.id is not null and coalesce(u.is_anonymous, false)`;
  if (audience === 'registered')
    return sql`u.id is not null and not coalesce(u.is_anonymous, false)`;
  return sql`true`;
};

const modelFilter = (column: ReturnType<typeof sql.raw>, models?: string[]) =>
  models
    ? sql`${column} in (${sql.join(
        models.map((model) => sql`${model}`),
        sql`, `,
      )})`
    : sql`true`;

// The only place a Model call's estimated spend is summed, so a later filter lands in one spot.
const callMetric = {
  tokens: sql`sum(mc.input_tokens + mc.cached_input_tokens + mc.output_tokens)::float8`,
  spend: sql`sum(mc.cost_usd)::float8`,
};

const rowsOf = async (query: ReturnType<typeof sql>) => {
  const { rows } = await db.execute<UsageRow>(query);
  return rows;
};

const emptyDayStats: UsageDayStats = {
  calls: 0,
  inputPerCall: null,
  outputPerCall: null,
  costPerCall: null,
  cacheReplays: 0,
  completionRate: null,
  avgDurationMs: null,
};

export const usageRepository = {
  // A user Message counts once: under the Session's Model, or under `run` when it started a Run.
  promptsByDay(from: string, to: string, audience: UsageAudience, models?: string[]) {
    return rowsOf(sql`
      select to_char(m.created_at, 'YYYY-MM-DD') as day,
        case when r.id is not null then 'run' else s.model end as key,
        count(*)::float8 as value
      from messages m
      join sessions s on s.id = m.session_id
      join users u on u.id = s.user_id
      left join runs r on r.message_id = m.id
      where m.role = 'user' and ${between(sql.raw('m.created_at'), from, to)}
        and ${audienceFilter(audience)}
        and ${modelFilter(sql.raw("case when r.id is not null then 'run' else s.model end"), models)}
      group by 1, 2`);
  },
  callsByDay(
    metric: Exclude<UsageMetric, 'prompts'>,
    from: string,
    to: string,
    audience: UsageAudience,
    models?: string[],
  ) {
    return rowsOf(sql`
      select to_char(mc.created_at, 'YYYY-MM-DD') as day, mc.model as key, ${callMetric[metric]} as value
      from model_calls mc
      left join users u on u.id = mc.user_id
      where ${between(sql.raw('mc.created_at'), from, to)}
        and ${audienceFilter(audience)} and ${modelFilter(sql.raw('mc.model'), models)}
      group by 1, 2`);
  },
  async dayStats(model: string, day: string, audience: UsageAudience): Promise<UsageDayStats> {
    const { rows } = await db.execute<UsageDayStats>(sql`
      select count(*)::int as "calls",
        avg(mc.input_tokens + mc.cached_input_tokens)::float8 as "inputPerCall",
        avg(mc.output_tokens)::float8 as "outputPerCall",
        avg(mc.cost_usd)::float8 as "costPerCall",
        (count(*) filter (where mc.cached))::int as "cacheReplays",
        (count(*) filter (where mc.outcome = 'completed'))::float8 / nullif(count(*), 0) as "completionRate",
        avg(mc.duration_ms)::float8 as "avgDurationMs"
      from model_calls mc
      left join users u on u.id = mc.user_id
      where mc.model = ${model} and ${between(sql.raw('mc.created_at'), day, day)}
        and ${audienceFilter(audience)}`);
    return rows[0] ?? emptyDayStats;
  },
  async totals(from: string, to: string, audience: UsageAudience): Promise<UsageTotals> {
    const [messageTotals, callTotals, runTotals] = await Promise.all([
      db.execute<Pick<UsageTotals, 'prompts' | 'activeUsers'>>(sql`
        select count(*)::float8 as prompts, count(distinct s.user_id)::float8 as "activeUsers"
        from messages m
        join sessions s on s.id = m.session_id
        join users u on u.id = s.user_id
        where m.role = 'user' and ${between(sql.raw('m.created_at'), from, to)}
          and ${audienceFilter(audience)}`),
      db.execute<Pick<UsageTotals, 'tokens' | 'spend' | 'calls' | 'cacheReplays'>>(sql`
        select coalesce(${callMetric.tokens}, 0) as tokens, coalesce(${callMetric.spend}, 0) as spend,
          count(*)::float8 as calls, (count(*) filter (where mc.cached))::float8 as "cacheReplays"
        from model_calls mc
        left join users u on u.id = mc.user_id
        where ${between(sql.raw('mc.created_at'), from, to)} and ${audienceFilter(audience)}`),
      db.execute<Pick<UsageTotals, 'runs'>>(sql`
        select count(*)::float8 as runs
        from runs r
        join users u on u.id = r.user_id
        where ${between(sql.raw('r.created_at'), from, to)} and ${audienceFilter(audience)}`),
    ]);
    return {
      prompts: messageTotals.rows[0]?.prompts ?? 0,
      activeUsers: messageTotals.rows[0]?.activeUsers ?? 0,
      tokens: callTotals.rows[0]?.tokens ?? 0,
      spend: callTotals.rows[0]?.spend ?? 0,
      calls: callTotals.rows[0]?.calls ?? 0,
      cacheReplays: callTotals.rows[0]?.cacheReplays ?? 0,
      runs: runTotals.rows[0]?.runs ?? 0,
    };
  },
};
