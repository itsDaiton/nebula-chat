import { createHash } from 'node:crypto';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { getModel } from '@nebula-chat/contracts';
import type { ReplyStreamEvent } from '@nebula-chat/contracts';
import type { StepPhase } from '@nebula-chat/db';
import { toErrorEnvelope } from '@nebula-chat/errors';
import type { ErrorEnvelope } from '@nebula-chat/errors';
import type { Logger } from '@nebula-chat/otel';
import type { AgentDefinition } from '@worker/runs/agentDefinition';
import { recordModelCall } from '@worker/modelCalls/recordModelCall';
import type { CallUsage, ModelCallLedger } from '@worker/modelCalls/recordModelCall';

/** Where a Run's Steps are persisted: Postgres in production. */
export type StepStore = {
  /** Writes the Step as `running` and returns its attempt: 1 when new, one more when it re-runs. */
  start: (step: {
    id: string;
    runId: string;
    phase: StepPhase;
    name: string;
    turn: number;
    parentStepId: string | null;
    input: unknown;
  }) => Promise<number>;
  /** What the Run's completed Steps used: the part of a resumed Run's total that will not be spent again. */
  completedTokens: (runId: string) => Promise<number>;
  finish: (
    stepId: string,
    result:
      | { status: 'completed'; output: unknown; tokens: number | null }
      | { status: 'failed'; error: ErrorEnvelope; tokens: number | null },
  ) => Promise<void>;
};

export type StepContext = {
  runId: string;
  userId: string;
  sessionId: string;
  steps: StepStore;
  ledger: ModelCallLedger;
  logger: Logger;
  /** What the Run's Steps have used so far, failed ones too: the Run budget is checked against it. */
  tally: { tokens: number };
};

// A UUID v5-style hash of the Step's identity, so a node re-run on resume finds its own row.
export const stepIdFor = (runId: string, phase: StepPhase, key: string): string => {
  const hex = createHash('sha1').update(`${runId}:${phase}:${key}`).digest('hex');
  const variant = ((parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

const tokensOf = (usage: CallUsage | undefined): number | null =>
  usage ? usage.inputTokens + usage.cachedInputTokens + usage.outputTokens : null;

export type ModelStep<T> = {
  phase: StepPhase;
  agent: AgentDefinition;
  input: unknown;
  /** The Step's id; derived from the Run, phase and Agent when omitted. */
  id?: string;
  turn?: number;
  parentStepId?: string | null;
  /** What is persisted as the Step's output, when not the call's result itself. */
  persist?: (output: T) => unknown;
};

/** Runs one model-calling Step: persisted, announced and its Model call recorded; a failure is recorded, then rethrown. */
export const runModelStep = async <T>(
  ctx: StepContext,
  step: ModelStep<T>,
  config: Pick<LangGraphRunnableConfig, 'writer' | 'signal'>,
  call: (reportUsage: (usage: CallUsage) => void) => Promise<T>,
): Promise<{ output: T; tokens: number }> => {
  const { phase, agent, input, turn = 0, parentStepId = null } = step;
  const id = step.id ?? stepIdFor(ctx.runId, phase, agent.name);
  const emit = (event: ReplyStreamEvent): void => config.writer?.(event);
  let usage: CallUsage | undefined;

  const attempt = await ctx.steps.start({
    id,
    runId: ctx.runId,
    phase,
    name: agent.name,
    turn,
    parentStepId,
    input,
  });
  emit({
    type: 'step-started',
    stepId: id,
    attempt,
    phase,
    agent: agent.name,
    label: agent.label,
    turn,
    parentStepId,
  });
  try {
    const output = await recordModelCall(
      ctx.ledger,
      ctx.logger,
      {
        // A re-run is a second, billed call, so it gets its own ledger row.
        idempotencyKey: `${id}:${attempt}`,
        userId: ctx.userId,
        sessionId: ctx.sessionId,
        runId: ctx.runId,
        stepId: id,
        agent: agent.name,
        provider: getModel(agent.model).provider,
        model: agent.model,
      },
      (reportUsage) =>
        call((reported) => {
          usage = reported;
          reportUsage(reported);
        }),
      config.signal,
    );
    const tokens = tokensOf(usage);
    await ctx.steps.finish(id, {
      status: 'completed',
      output: step.persist ? step.persist(output) : output,
      tokens,
    });
    emit({ type: 'step-finished', stepId: id, status: 'completed' });
    ctx.tally.tokens += tokens ?? 0;
    return { output, tokens: tokens ?? 0 };
  } catch (error) {
    // A failed or stopped call still spent what it reported.
    ctx.tally.tokens += tokensOf(usage) ?? 0;
    await ctx.steps.finish(id, {
      status: 'failed',
      error: toErrorEnvelope(error),
      tokens: tokensOf(usage),
    });
    emit({ type: 'step-finished', stepId: id, status: 'failed' });
    throw error;
  }
};
