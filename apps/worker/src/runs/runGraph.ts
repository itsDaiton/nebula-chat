import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, mergeUsageMetadata, SystemMessage } from '@langchain/core/messages';
import type { BaseMessage, UsageMetadata } from '@langchain/core/messages';
import { Annotation, END, messagesStateReducer, START, StateGraph } from '@langchain/langgraph';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { getModel } from '@nebula-chat/contracts';
import type { ModelProvider } from '@nebula-chat/contracts';
import { MissingConfigurationError } from '@nebula-chat/errors';
import { componentLogger, logEvent } from '@nebula-chat/otel';
import type { z } from 'zod';
import type { AgentDefinition } from '@worker/runs/agentDefinition';
import { languageDetectionSchema } from '@worker/agents/languageDetection';
import type { LanguageDetection } from '@worker/agents/languageDetection';
import { outputInput } from '@worker/agents/output';
import { AGENTS } from '@worker/runs/agentRegistry';
import { sessionSummaryInput, sessionSummarySchema } from '@worker/agents/sessionSummary';
import type { SessionSummary } from '@worker/agents/sessionSummary';
import type { HistoryMessage } from '@worker/directReplies/streamChat';
import { toCallUsage } from '@worker/llm/callUsage';
import { llmConcurrencyLimiter } from '@worker/llm/concurrencyLimiter';
import { countTokens } from '@worker/llm/countTokens';
import type { LLMConfig } from '@worker/llm/createLLM';
import type { Prompts } from '@worker/llm/prompts';
import type { StructuredCall } from '@worker/llm/structuredOutput';
import { buildBrief } from '@worker/runs/brief';
import type { Brief } from '@worker/runs/brief';
import { runModelStep } from '@worker/runs/steps';
import type { StepContext } from '@worker/runs/steps';

/** The model layer a Run calls through; tests script both. */
export type RunModels = {
  structured: StructuredCall;
  /** A streaming chat model, for the Output Agent. */
  chat: (config: LLMConfig) => BaseChatModel;
};

export type RunGraphDeps = StepContext & {
  models: RunModels;
  prompts: Prompts;
  apiKeys: { [P in ModelProvider]?: string | undefined };
  saveBrief: (brief: Brief) => Promise<void>;
  /** The triggering user Message, and the Session's earlier Messages oldest first. */
  message: string;
  history: HistoryMessage[];
};

// The Output node's name: the stream mapping forwards only its tokens.
export const OUTPUT_NODE = 'output';

const RunState = Annotation.Root({
  // The Orchestrator's nested agent reads and writes this; nothing does yet.
  messages: Annotation<BaseMessage[]>({ reducer: messagesStateReducer, default: () => [] }),
  language: Annotation<LanguageDetection | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  summary: Annotation<SessionSummary | null>({ reducer: (_, next) => next, default: () => null }),
  // The Intake Agents that failed, so the Brief is partial and the Run ends `partial`.
  missing: Annotation<string[]>({ reducer: (all, next) => all.concat(next), default: () => [] }),
  brief: Annotation<Brief | null>({ reducer: (_, next) => next, default: () => null }),
  answer: Annotation<string>({ reducer: (_, next) => next, default: () => '' }),
  tokensUsed: Annotation<number>({ reducer: (sum, next) => sum + next, default: () => 0 }),
});

type RunStateValues = typeof RunState.State;

const llmConfigFor = (agent: AgentDefinition, deps: RunGraphDeps): LLMConfig => {
  const { provider } = getModel(agent.model);
  const apiKey = deps.apiKeys[provider];
  if (!apiKey) {
    throw new MissingConfigurationError(
      provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY',
    );
  }
  return { provider, apiKey, model: agent.model, ...agent.parameters };
};

// Everything the model was sent, so a Step can be inspected on its own.
const stepInput = (agent: AgentDefinition, system: string, human: string) => ({
  model: agent.model,
  parameters: agent.parameters,
  system,
  human,
});

// A failing Intake Agent must not fail the graph step: its Step is recorded failed and its part of the Brief is missing.
const intakeNode =
  <T extends Record<string, unknown>>(
    agent: AgentDefinition,
    schema: z.ZodType<T>,
    key: 'language' | 'summary',
    input: (deps: RunGraphDeps) => string,
    deps: RunGraphDeps,
  ) =>
  async (_state: RunStateValues, config: LangGraphRunnableConfig) => {
    const system = deps.prompts[agent.prompt];
    const human = input(deps);
    try {
      const { output, tokens } = await runModelStep(
        deps,
        { phase: 'intake', agent, input: stepInput(agent, system, human) },
        config,
        async (reportUsage) => {
          const { output: parsed, usage } = await deps.models.structured({
            ...llmConfigFor(agent, deps),
            name: agent.name,
            schema,
            messages: [new SystemMessage(system), new HumanMessage(human)],
            config,
          });
          if (usage) reportUsage(usage);
          return parsed;
        },
      );
      return { [key]: output, tokensUsed: tokens };
    } catch (err) {
      logEvent(
        componentLogger(deps.logger, 'chat'),
        'warn',
        'chat.run.step.failed',
        { err, 'nebula.agent.name': agent.name },
        `Intake Agent ${agent.name} failed; the Brief goes without it`,
      );
      return { missing: [agent.name] };
    }
  };

const outputNode =
  (deps: RunGraphDeps) => async (state: RunStateValues, config: LangGraphRunnableConfig) => {
    const agent = AGENTS.output;
    const brief = state.brief ?? buildBrief(null, null, state.missing);
    const system = deps.prompts[agent.prompt];
    const human = outputInput(brief, deps.message);
    const { output, tokens } = await runModelStep(
      deps,
      { phase: 'output', agent, input: stepInput(agent, system, human) },
      config,
      (reportUsage) =>
        llmConcurrencyLimiter(async () => {
          const model = deps.models.chat({ ...llmConfigFor(agent, deps), streaming: true });
          let answer = '';
          let reported: UsageMetadata | undefined;
          try {
            // Passing the config lets the graph's `messages` stream see each token.
            const stream = await model.stream(
              [new SystemMessage(system), new HumanMessage(human)],
              config,
            );
            for await (const chunk of stream) {
              answer += chunk.text;
              if (chunk.usage_metadata)
                reported = mergeUsageMetadata(reported, chunk.usage_metadata);
            }
          } finally {
            const usage = toCallUsage(reported, {
              promptTokens: countTokens(system, agent.model) + countTokens(human, agent.model),
              completionTokens: countTokens(answer, agent.model),
            });
            if (usage) reportUsage(usage);
          }
          if (!answer.trim()) throw new Error('The assistant did not generate a response.');
          return { answer };
        }),
    );
    return { answer: output.answer, tokensUsed: tokens };
  };

/** A Run: the Intake Agents fan out from the start, fan in to the Brief, then the Output Agent answers. */
export const createRunGraph = (deps: RunGraphDeps) =>
  new StateGraph(RunState)
    .addNode(
      'languageDetection',
      intakeNode(
        AGENTS.languageDetection,
        languageDetectionSchema,
        'language',
        (d) => d.message,
        deps,
      ),
    )
    .addNode(
      'sessionSummary',
      intakeNode(
        AGENTS.sessionSummary,
        sessionSummarySchema,
        'summary',
        (d) => sessionSummaryInput(d.history, d.message),
        deps,
      ),
    )
    .addNode('buildBrief', async (state: RunStateValues) => {
      const brief = buildBrief(state.language, state.summary, state.missing);
      await deps.saveBrief(brief);
      return { brief };
    })
    .addNode(OUTPUT_NODE, outputNode(deps))
    .addEdge(START, 'languageDetection')
    .addEdge(START, 'sessionSummary')
    .addEdge(['languageDetection', 'sessionSummary'], 'buildBrief')
    .addEdge('buildBrief', OUTPUT_NODE)
    .addEdge(OUTPUT_NODE, END);
