import { sql } from 'drizzle-orm';
import { db } from '@server/db';
import type {
  UsageAudience,
  UsageAgentRow,
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
  spend: sql`(sum(mc.cost_usd) filter (where not mc.own_key))::float8`,
};

const rowsOf = async (query: ReturnType<typeof sql>) => {
  const { rows } = await db.execute<UsageRow>(query);
  return rows;
};

const stepFilter = sql`mc.run_id is not null`;

const emptyDayStats: UsageDayStats = {
  calls: 0,
  inputPerCall: null,
  outputPerCall: null,
  costPerCall: null,
  cacheReplays: 0,
  completionRate: null,
  avgDurationMs: null,
};

const dayStatsWhere = async (
  condition: ReturnType<typeof sql>,
  day: string,
  audience: UsageAudience,
): Promise<UsageDayStats> => {
  const { rows } = await db.execute<UsageDayStats>(sql`
    select count(*)::int as "calls",
      avg(mc.input_tokens + mc.cached_input_tokens)::float8 as "inputPerCall",
      avg(mc.output_tokens)::float8 as "outputPerCall",
      (avg(mc.cost_usd) filter (where not mc.own_key))::float8 as "costPerCall",
      (count(*) filter (where mc.cached))::int as "cacheReplays",
      (count(*) filter (where mc.outcome = 'completed'))::float8 / nullif(count(*), 0) as "completionRate",
      avg(mc.duration_ms)::float8 as "avgDurationMs"
    from model_calls mc
    left join users u on u.id = mc.user_id
    where ${condition} and ${between(sql.raw('mc.created_at'), day, day)}
      and ${audienceFilter(audience)}`);
  return rows[0] ?? emptyDayStats;
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
  // Runs by the day they were created and how they ended; unfinished ones are left to the caller.
  runsByDay(from: string, to: string, audience: UsageAudience) {
    return rowsOf(sql`
      select to_char(r.created_at, 'YYYY-MM-DD') as day, r.status as key, count(*)::float8 as value
      from runs r
      join users u on u.id = r.user_id
      where ${between(sql.raw('r.created_at'), from, to)} and ${audienceFilter(audience)}
      group by 1, 2`);
  },
  async agentCallsByDay(from: string, to: string, audience: UsageAudience) {
    const { rows } = await db.execute<UsageAgentRow>(sql`
      select to_char(mc.created_at, 'YYYY-MM-DD') as day, coalesce(mc.agent, 'unknown') as key,
        coalesce(${callMetric.spend}, 0) as spend, ${callMetric.tokens} as tokens
      from model_calls mc
      left join users u on u.id = mc.user_id
      where ${stepFilter} and ${between(sql.raw('mc.created_at'), from, to)}
        and ${audienceFilter(audience)}
      group by 1, 2`);
    return rows;
  },
  agentTrendByDay(agent: string, from: string, to: string, audience: UsageAudience) {
    return rowsOf(sql`
      select to_char(mc.created_at, 'YYYY-MM-DD') as day, coalesce(mc.agent, 'unknown') as key,
        count(*)::float8 as value
      from model_calls mc
      left join users u on u.id = mc.user_id
      where ${stepFilter} and coalesce(mc.agent, 'unknown') = ${agent}
        and ${between(sql.raw('mc.created_at'), from, to)} and ${audienceFilter(audience)}
      group by 1, 2`);
  },
  agentDayStats(agent: string, day: string, audience: UsageAudience) {
    return dayStatsWhere(
      sql`${stepFilter} and coalesce(mc.agent, 'unknown') = ${agent}`,
      day,
      audience,
    );
  },
  dayStats(model: string, day: string, audience: UsageAudience) {
    return dayStatsWhere(sql`mc.model = ${model}`, day, audience);
  },
  async totals(from: string, to: string, audience: UsageAudience): Promise<UsageTotals> {
    const [messageTotals, callTotals, runTotals, stepTotals, runCallTotals] = await Promise.all([
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
      db.execute<Pick<UsageTotals, 'runs' | 'runDurationMs'>>(sql`
        select count(*)::float8 as runs,
          (avg(extract(epoch from (r.finished_at - r.started_at)) * 1000)
            filter (where r.finished_at is not null and r.started_at is not null))::float8 as "runDurationMs"
        from runs r
        join users u on u.id = r.user_id
        where ${between(sql.raw('r.created_at'), from, to)} and ${audienceFilter(audience)}`),
      db.execute<Pick<UsageTotals, 'runSteps'>>(sql`
        select count(*)::float8 as "runSteps"
        from steps st
        join runs r on r.id = st.run_id
        join users u on u.id = r.user_id
        where ${between(sql.raw('r.created_at'), from, to)} and ${audienceFilter(audience)}`),
      db.execute<Pick<UsageTotals, 'runCalls' | 'runTokens' | 'runSpend'>>(sql`
        select count(*)::float8 as "runCalls", coalesce(${callMetric.tokens}, 0) as "runTokens",
          coalesce(${callMetric.spend}, 0) as "runSpend"
        from model_calls mc
        join runs r on r.id = mc.run_id
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
      runDurationMs: runTotals.rows[0]?.runDurationMs ?? null,
      runSteps: stepTotals.rows[0]?.runSteps ?? 0,
      runCalls: runCallTotals.rows[0]?.runCalls ?? 0,
      runTokens: runCallTotals.rows[0]?.runTokens ?? 0,
      runSpend: runCallTotals.rows[0]?.runSpend ?? 0,
    };
  },
};
