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
    input: unknown;
  }) => Promise<number>;
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
};

// A UUID v5-style hash of the Step's identity, so a node re-run on resume finds its own row.
const stepIdFor = (runId: string, phase: StepPhase, name: string): string => {
  const hex = createHash('sha1').update(`${runId}:${phase}:${name}`).digest('hex');
  const variant = ((parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

const tokensOf = (usage: CallUsage | undefined): number | null =>
  usage ? usage.inputTokens + usage.cachedInputTokens + usage.outputTokens : null;

/** Runs one model-calling Step: persisted, announced and its Model call recorded; a failure is recorded, then rethrown. */
export const runModelStep = async <T>(
  ctx: StepContext,
  step: { phase: StepPhase; agent: AgentDefinition; input: unknown },
  config: LangGraphRunnableConfig,
  call: (reportUsage: (usage: CallUsage) => void) => Promise<T>,
): Promise<{ output: T; tokens: number }> => {
  const { phase, agent, input } = step;
  const id = stepIdFor(ctx.runId, phase, agent.name);
  const emit = (event: ReplyStreamEvent): void => config.writer?.(event);
  let usage: CallUsage | undefined;

  const attempt = await ctx.steps.start({ id, runId: ctx.runId, phase, name: agent.name, input });
  emit({ type: 'step-started', stepId: id, attempt, phase, agent: agent.name, label: agent.label });
  try {
    const output = await recordModelCall(
      ctx.ledger,
      ctx.logger,
      {
        idempotencyKey: id,
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
    );
    await ctx.steps.finish(id, { status: 'completed', output, tokens: tokensOf(usage) });
    emit({ type: 'step-finished', stepId: id, status: 'completed' });
    return { output, tokens: tokensOf(usage) ?? 0 };
  } catch (error) {
    await ctx.steps.finish(id, {
      status: 'failed',
      error: toErrorEnvelope(error),
      tokens: tokensOf(usage),
    });
    emit({ type: 'step-finished', stepId: id, status: 'failed' });
    throw error;
  }
};
