import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import { AIMessage, AIMessageChunk, ToolMessage } from '@langchain/core/messages';
import type { BaseMessage, ToolCall, UsageMetadata } from '@langchain/core/messages';
import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { ChatGenerationChunk } from '@langchain/core/outputs';
import type { ChatResult } from '@langchain/core/outputs';
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
  tokenBudget?: number;
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
    markRunning: async (runId, tokenBudget) => {
      Object.assign(runs.get(runId)!, { status: 'running', tokenBudget });
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
  turn: number;
  parentStepId: string | null;
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
    start: async ({ id, runId, phase, name, turn, parentStepId, input }) => {
      const attempt = (steps.get(id)?.attempt ?? 0) + 1;
      steps.set(id, {
        id,
        runId,
        phase,
        name,
        turn,
        parentStepId,
        input,
        attempt,
        status: 'running',
      });
      return attempt;
    },
    finish: async (stepId, { status, tokens, ...result }) => {
      Object.assign(steps.get(stepId)!, { status, tokens, ...result });
    },
  };
  return { store, steps };
};

type StructuredScript = Record<string, Record<string, unknown> | Error>;

/** The Orchestrator's next reply, decided from the messages it is sent, so one script serves every turn. */
export type OrchestratorScript = (messages: BaseMessage[]) => AIMessage;

/** A delegate Agent's answer to a task, or its failure; `delayMs` holds it in flight that long. */
export type DelegateScript = Record<string, { reply: string | Error; delayMs?: number }>;

const MODEL_USAGE: UsageMetadata = {
  input_tokens: 100,
  output_tokens: 20,
  total_tokens: 120,
};

const call = (name: string, id: string, task: string): ToolCall => ({
  name,
  id,
  args: { task },
  type: 'tool_call',
});

const withUsage = (message: AIMessage): AIMessage =>
  Object.assign(message, { usage_metadata: MODEL_USAGE });

export const orchestratorReply = (content: string, toolCalls: ToolCall[] = []): AIMessage =>
  withUsage(new AIMessage({ content, tool_calls: toolCalls }));

/** Delegates `calls` on its first turn, then hands off with its delegates' results as its findings. */
export const delegatingOnce =
  (
    calls: [agent: string, id: string][] = [
      ['analyst', 'call_analyst_1'],
      ['critic', 'call_critic_1'],
    ],
  ): OrchestratorScript =>
  (messages) => {
    const results = messages.filter(ToolMessage.isInstance);
    if (results.length === 0) {
      return orchestratorReply(
        '',
        calls.map(([agent, id]) => call(agent, id, `Task for the ${agent}`)),
      );
    }
    return orchestratorReply(`Findings: ${results.map((m) => m.text).join(' | ')}`);
  };

/** Delegates to the analyst on every turn, never handing off. */
export const neverHandingOff: OrchestratorScript = (messages) => {
  const turn = messages.filter(AIMessage.isInstance).length + 1;
  return orchestratorReply('', [call('analyst', `call_analyst_${turn}`, `Task ${turn}`)]);
};

const DELEGATE_PROMPTS: Record<string, string> = {
  'Analyst prompt': 'analyst',
  'Critic prompt': 'critic',
};

const sleep = (ms: number, signal: AbortSignal | undefined): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });

/** Streams `chunks` with a pause before each, failing as a provider does when its call is aborted. */
class PacedStreamingChatModel extends FakeStreamingChatModel {
  override async *_streamResponseChunks(
    _messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun,
  ): AsyncGenerator<ChatGenerationChunk> {
    for (const chunk of this.chunks) {
      await sleep(this.sleep, options.signal);
      const text = chunk.text;
      yield new ChatGenerationChunk({ message: new AIMessageChunk(text), text });
      await runManager?.handleLLMNewToken(text);
    }
  }
}

type ScriptedCall = { agent: string; messages: BaseMessage[]; tools: string[] };

/** A tool-calling chat model whose reply is scripted per Agent, told apart by its system prompt. */
class ScriptedChatModel extends BaseChatModel {
  private boundTools: string[] = [];

  constructor(
    private readonly script: { orchestrator: OrchestratorScript; delegates: DelegateScript },
    private readonly calls: ScriptedCall[],
    private readonly inFlight: { now: number; max: number },
  ) {
    super({});
  }

  _llmType(): string {
    return 'scripted';
  }

  override bindTools(tools: { name: string }[]): this {
    this.boundTools = tools.map((t) => t.name);
    return this;
  }

  async _generate(messages: BaseMessage[], options: BaseChatModelCallOptions): Promise<ChatResult> {
    const [system, ...rest] = messages;
    const delegate = DELEGATE_PROMPTS[system?.text ?? ''];
    this.calls.push({
      agent: delegate ?? 'orchestrator',
      messages: delegate ? messages : rest,
      tools: this.boundTools,
    });
    if (!delegate) {
      const message = this.script.orchestrator(rest);
      return { generations: [{ message, text: message.text }] };
    }
    const scripted = this.script.delegates[delegate] ?? { reply: `${delegate} result` };
    this.inFlight.now += 1;
    this.inFlight.max = Math.max(this.inFlight.max, this.inFlight.now);
    try {
      // Calls in flight together overlap only if the agent started them together.
      await sleep(scripted.delayMs ?? 10, options.signal);
    } finally {
      this.inFlight.now -= 1;
    }
    if (scripted.reply instanceof Error) throw scripted.reply;
    const message = withUsage(new AIMessage(scripted.reply));
    return { generations: [{ message, text: scripted.reply }] };
  }
}

/**
 * Models scripted per Agent: Intake returns its typed object or fails, the Orchestrator follows its
 * script, a delegate answers its task, and Output streams `tokens`; every call is kept.
 */
export const scriptedModels = (
  intake: StructuredScript,
  tokens: string[],
  {
    orchestrator = delegatingOnce(),
    delegates = {},
    outputSleepMs = 0,
    intakeUsage = {
      inputTokens: 40,
      cachedInputTokens: 0,
      outputTokens: 10,
      estimated: false,
    },
  }: {
    orchestrator?: OrchestratorScript;
    delegates?: DelegateScript;
    /** The pause between the answer's tokens, so a test can stop a Run while it streams. */
    outputSleepMs?: number;
    intakeUsage?: CallUsage;
  } = {},
) => {
  const structuredCalls: { name: string; model: string; messages: BaseMessage[] }[] = [];
  const chatCalls: { config: LLMConfig; messages: BaseMessage[] }[] = [];
  const agentCalls: ScriptedCall[] = [];
  const delegatesInFlight = { now: 0, max: 0 };
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

  // Only the Output Agent streams; the Orchestrator and the delegates are tool-calling or plain calls.
  const chat = (config: LLMConfig): BaseChatModel => {
    if (!config.streaming) {
      return new ScriptedChatModel({ orchestrator, delegates }, agentCalls, delegatesInFlight);
    }
    const model = new PacedStreamingChatModel({
      sleep: outputSleepMs,
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
  return {
    models,
    structuredCalls,
    chatCalls,
    agentCalls,
    maxInFlight: () => maxInFlight,
    maxDelegatesInFlight: () => delegatesInFlight.max,
  };
};

/** An Output Agent whose model fails before streaming, as a provider outage would. */
export const failingChat = (message: string) => (): BaseChatModel =>
  new FakeStreamingChatModel({ thrownErrorString: message });
