import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage, AIMessageChunk } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { FakeStreamingChatModel } from '@langchain/core/utils/testing';
import type { ErrorEnvelope } from '@nebula-chat/errors';
import type { StepPhase, StepStatus } from '@nebula-chat/db';
import type { StoredMessage } from '@worker/directReplies/runDirectReply';
import type { LLMConfig } from '@worker/llm/createLLM';
import type { StructuredCall } from '@worker/llm/structuredOutput';
import type { CallUsage } from '@worker/modelCalls/recordModelCall';
import type { Brief } from '@worker/runs/brief';
import type { RunStore } from '@worker/runs/executeRun';
import type { RunModels } from '@worker/runs/runGraph';
import type { StepStore } from '@worker/runs/steps';

type StoredRun = {
  id: string;
  userId: string;
  status: string;
  brief: Brief | null;
  tokensUsed: number;
};

type StoredAssistantMessage = Parameters<RunStore['createAssistantMessage']>[0];

/** Runs and a Session's Messages in memory, as Postgres keeps them. */
export const memoryRuns = () => {
  const runs = new Map<string, StoredRun>();
  const messages: (StoredMessage & { sessionId: string })[] = [];
  const created: StoredAssistantMessage[] = [];
  const store: RunStore = {
    findRun: async (runId, userId) => {
      const run = runs.get(runId);
      return run?.userId === userId ? { id: run.id } : null;
    },
    findRecentMessages: async (sessionId, limit) =>
      messages
        .filter((m) => m.sessionId === sessionId)
        .toReversed()
        .slice(0, limit)
        .map(({ id, role, content }) => ({ id, role, content })),
    markRunning: async (runId) => {
      runs.get(runId)!.status = 'running';
    },
    saveBrief: async (runId, brief) => {
      runs.get(runId)!.brief = brief;
    },
    finishRun: async (runId, { status, tokensUsed }) => {
      Object.assign(runs.get(runId)!, { status, tokensUsed });
    },
    createAssistantMessage: async (message) => {
      created.push(message);
    },
  };
  return { store, runs, messages, created };
};

type StoredStep = {
  id: string;
  runId: string;
  phase: StepPhase;
  name: string;
  attempt: number;
  input: unknown;
  output?: unknown;
  error?: ErrorEnvelope;
  tokens?: number | null;
  status: StepStatus;
};

/** Steps in memory, keyed by id like the table: starting one that exists is a re-run. */
export const memorySteps = () => {
  const steps = new Map<string, StoredStep>();
  const store: StepStore = {
    start: async ({ id, runId, phase, name, input }) => {
      const attempt = (steps.get(id)?.attempt ?? 0) + 1;
      steps.set(id, { id, runId, phase, name, input, attempt, status: 'running' });
      return attempt;
    },
    finish: async (stepId, { status, tokens, ...result }) => {
      Object.assign(steps.get(stepId)!, { status, tokens, ...result });
    },
  };
  return { store, steps };
};

type StructuredScript = Record<string, Record<string, unknown> | Error>;

/** Models scripted per Agent: Intake returns its typed object or fails, Output streams `tokens`; every call is kept. */
export const scriptedModels = (
  intake: StructuredScript,
  tokens: string[],
  intakeUsage: CallUsage = {
    inputTokens: 40,
    cachedInputTokens: 0,
    outputTokens: 10,
    estimated: false,
  },
) => {
  const structuredCalls: { name: string; model: string; messages: BaseMessage[] }[] = [];
  const chatCalls: { config: LLMConfig; messages: BaseMessage[] }[] = [];
  let inFlight = 0;
  let maxInFlight = 0;

  const structured: StructuredCall = async <T extends Record<string, unknown>>(
    request: Parameters<StructuredCall>[0],
  ) => {
    structuredCalls.push({
      name: request.name,
      model: request.model ?? '',
      messages: request.messages,
    });
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    // Both Intake calls are in flight together only if the graph started them together.
    await new Promise((resolve) => setTimeout(resolve, 10));
    inFlight -= 1;
    const scripted = intake[request.name];
    if (scripted === undefined) throw new Error(`No script for ${request.name}`);
    if (scripted instanceof Error) throw scripted;
    // As a provider does, the call streams its JSON through a chat model under the graph's config.
    const json = new FakeStreamingChatModel({
      sleep: 0,
      responses: [new AIMessage(JSON.stringify(scripted))],
    });
    await json.invoke(request.messages, request.config);
    return { output: scripted as T, usage: intakeUsage };
  };

  const chat = (config: LLMConfig): BaseChatModel => {
    const model = new FakeStreamingChatModel({
      chunks: tokens.map((token) => new AIMessageChunk(token)),
    });
    const stream = model.stream.bind(model);
    model.stream = async (input, options) => {
      chatCalls.push({ config, messages: input as BaseMessage[] });
      return stream(input, options);
    };
    return model;
  };

  const models: RunModels = { structured, chat };
  return { models, structuredCalls, chatCalls, maxInFlight: () => maxInFlight };
};

/** An Output Agent whose model fails before streaming, as a provider outage would. */
export const failingChat = (message: string) => (): BaseChatModel =>
  new FakeStreamingChatModel({ thrownErrorString: message });
