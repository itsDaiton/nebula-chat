import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, mergeUsageMetadata, SystemMessage } from '@langchain/core/messages';
import type { BaseMessage, UsageMetadata } from '@langchain/core/messages';
import { Annotation, END, messagesStateReducer, START, StateGraph } from '@langchain/langgraph';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { componentLogger, logEvent } from '@nebula-chat/otel';
import type { z } from 'zod';
import { llmConfigFor, stepInput } from '@worker/runs/agentDefinition';
import type { AgentDefinition } from '@worker/runs/agentDefinition';
import { languageSchema } from '@worker/agents/language';
import { orchestratorInput } from '@worker/agents/orchestrator';
import { outputInput } from '@worker/agents/output';
import { sessionInput, sessionSchema } from '@worker/agents/session';
import { AGENTS } from '@worker/runs/agentRegistry';
import type { HistoryMessage } from '@worker/directReplies/streamChat';
import { toCallUsage } from '@worker/llm/callUsage';
import { llmConcurrencyLimiter } from '@worker/llm/concurrencyLimiter';
import { countTokens } from '@worker/llm/countTokens';
import type { LLMConfig } from '@worker/llm/createLLM';
import type { StructuredCall } from '@worker/llm/structuredOutput';
import { buildBrief } from '@worker/runs/brief';
import type { Brief, IntakeOutputs } from '@worker/runs/brief';
import { createOrchestrator } from '@worker/runs/orchestrator';
import type { LoopEnding, OrchestratorDeps } from '@worker/runs/orchestrator';
import { findingsOf } from '@worker/runs/findings';
import { runModelStep } from '@worker/runs/steps';

/** The model layer a Run calls through; tests script both. */
export type RunModels = {
  structured: StructuredCall;
  /** A chat model: tool-calling for the Orchestrator, plain for a delegate, streaming for the Output Agent. */
  chat: (config: LLMConfig) => BaseChatModel;
};

export type RunGraphDeps = OrchestratorDeps & {
  saveBrief: (brief: Brief) => Promise<void>;
  /** The triggering user Message, and the Session's earlier Messages oldest first. */
  message: string;
  history: HistoryMessage[];
};

// The Output node's name: the stream mapping forwards only its tokens.
export const OUTPUT_NODE = 'output';

const RunState = Annotation.Root({
  // The Orchestrator's conversation: the Brief, its turns and its delegates' results.
  messages: Annotation<BaseMessage[]>({ reducer: messagesStateReducer, default: () => [] }),
  // Each Intake Agent's output under its name; the parallel nodes each add their own.
  intake: Annotation<Partial<IntakeOutputs>>({
    reducer: (all, next) => ({ ...all, ...next }),
    default: () => ({}),
  }),
  // The Intake Agents that failed, so the Brief is partial and the Run ends `partial`.
  missing: Annotation<string[]>({ reducer: (all, next) => all.concat(next), default: () => [] }),
  brief: Annotation<Brief | null>({ reducer: (_, next) => next, default: () => null }),
  // How the Orchestrator's loop ended: anything but its own handoff ends the Run `partial`.
  ending: Annotation<LoopEnding | null>({ reducer: (_, next) => next, default: () => null }),
  answer: Annotation<string>({ reducer: (_, next) => next, default: () => '' }),
});

type RunStateValues = typeof RunState.State;

// A failing Intake Agent must not fail the graph step: its Step is recorded failed and its part of the Brief is missing.
const intakeNode =
  <K extends keyof IntakeOutputs>(
    agent: AgentDefinition & { name: K },
    schema: z.ZodType<IntakeOutputs[K]>,
    input: (deps: RunGraphDeps) => string,
    deps: RunGraphDeps,
  ) =>
  async (_state: RunStateValues, config: LangGraphRunnableConfig) => {
    const system = deps.prompts[agent.prompt];
    const human = input(deps);
    try {
      const { output } = await runModelStep(
        deps,
        { phase: 'intake', agent, input: stepInput(agent, system, human) },
        config,
        async (reportUsage) => {
          const { output: parsed, usage } = await deps.models.structured({
            ...llmConfigFor(agent, deps.apiKeys),
            name: agent.name,
            schema,
            messages: [new SystemMessage(system), new HumanMessage(human)],
            config,
          });
          if (usage) reportUsage(usage);
          return parsed;
        },
      );
      return { intake: { [agent.name]: output } };
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
    const brief = state.brief ?? buildBrief(state.intake, state.missing);
    const system = deps.prompts[agent.prompt];
    const human = outputInput(brief, deps.message, findingsOf(state.messages, state.ending));
    const { output } = await runModelStep(
      deps,
      { phase: 'output', agent, input: stepInput(agent, system, human) },
      config,
      (reportUsage) =>
        llmConcurrencyLimiter(async () => {
          const model = deps.models.chat({ ...llmConfigFor(agent, deps.apiKeys), streaming: true });
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
    return { answer: output.answer };
  };

// The Orchestrator's agent runs nested in this node, sharing the Run's checkpointer and abort signal.
const orchestratorNode =
  (deps: RunGraphDeps) => async (state: RunStateValues, config: LangGraphRunnableConfig) => {
    const brief = state.brief ?? buildBrief(state.intake, state.missing);
    const orchestrator = createOrchestrator(deps);
    const result = await orchestrator.loop.invoke(
      { messages: [new HumanMessage(orchestratorInput(brief, deps.message))] },
      { ...config, recursionLimit: orchestrator.recursionLimit },
    );
    return { messages: result.messages, ending: orchestrator.ending() };
  };

// Intake fans out and in to the Brief, the Orchestrator delegates turn by turn, the Output Agent answers.
export const createRunGraph = (deps: RunGraphDeps) =>
  new StateGraph(RunState)
    .addNode(
      'language',
      intakeNode(AGENTS.language, languageSchema, (d) => d.message, deps),
    )
    .addNode(
      'session',
      intakeNode(AGENTS.session, sessionSchema, (d) => sessionInput(d.history, d.message), deps),
    )
    .addNode('buildBrief', async (state: RunStateValues) => {
      const brief = buildBrief(state.intake, state.missing);
      await deps.saveBrief(brief);
      return { brief };
    })
    .addNode('orchestrator', orchestratorNode(deps))
    .addNode(OUTPUT_NODE, outputNode(deps))
    .addEdge(START, 'language')
    .addEdge(START, 'session')
    .addEdge(['language', 'session'], 'buildBrief')
    .addEdge('buildBrief', 'orchestrator')
    .addEdge('orchestrator', OUTPUT_NODE)
    .addEdge(OUTPUT_NODE, END);
