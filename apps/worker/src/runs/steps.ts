import { createHash } from 'node:crypto';
import { AIMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
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

/** The Orchestrator turn a message list is on: one reply per earlier turn, so it survives a resume. */
export const turnsIn = (messages: BaseMessage[]): number =>
  messages.filter(AIMessage.isInstance).length;

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

// A Step's lifecycle: persisted `running`, announced, then finished either way; a failure is rethrown.
const runStep = async <T>(
  ctx: StepContext,
  step: {
    id: string;
    phase: StepPhase;
    name: string;
    label: string;
    turn: number;
    parentStepId: string | null;
    input: unknown;
    persist: ((output: T) => unknown) | undefined;
    /** What the Step used, read once it has finished. */
    tokens: () => number | null;
  },
  config: Pick<LangGraphRunnableConfig, 'writer'>,
  body: (attempt: number) => Promise<T>,
): Promise<{ output: T; tokens: number }> => {
  const { id, phase, name, label, turn, parentStepId, input } = step;
  const emit = (event: ReplyStreamEvent): void => config.writer?.(event);
  const attempt = await ctx.steps.start({
    id,
    runId: ctx.runId,
    phase,
    name,
    turn,
    parentStepId,
    input,
  });
  emit({
    type: 'step-started',
    stepId: id,
    attempt,
    phase,
    agent: name,
    label,
    turn,
    parentStepId,
  });
  try {
    const output = await body(attempt);
    const tokens = step.tokens();
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
    const tokens = step.tokens();
    ctx.tally.tokens += tokens ?? 0;
    await ctx.steps.finish(id, { status: 'failed', error: toErrorEnvelope(error), tokens });
    emit({ type: 'step-finished', stepId: id, status: 'failed' });
    throw error;
  }
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
  let usage: CallUsage | undefined;
  return runStep(
    ctx,
    {
      id,
      phase,
      name: agent.name,
      label: agent.label,
      turn,
      parentStepId,
      input,
      persist: step.persist,
      tokens: () => tokensOf(usage),
    },
    config,
    (attempt) =>
      recordModelCall(
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
      ),
  );
};

/** Runs one tool call as a `tool` Step under the delegate that made it; it uses no tokens of its own. */
export const runToolStep = <T>(
  ctx: StepContext,
  step: {
    id: string;
    name: string;
    label: string;
    turn: number;
    parentStepId: string;
    input: unknown;
    persist: (output: T) => unknown;
  },
  config: Pick<LangGraphRunnableConfig, 'writer'>,
  call: () => Promise<T>,
): Promise<{ output: T; tokens: number }> =>
  runStep(ctx, { ...step, phase: 'tool', tokens: () => null }, config, call);
