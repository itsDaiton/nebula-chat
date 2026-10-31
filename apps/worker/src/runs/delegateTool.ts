import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import type { ToolRuntime } from '@langchain/core/tools';
import { createAgent, createMiddleware, toolCallLimitMiddleware } from 'langchain';
import type { AgentMiddleware } from 'langchain';
import { z } from 'zod';
import { llmConcurrencyLimiter } from '@worker/llm/concurrencyLimiter';
import { countTokens } from '@worker/llm/countTokens';
import { toCallUsage } from '@worker/llm/callUsage';
import type { Prompts } from '@worker/llm/prompts';
import type { CallUsage } from '@worker/modelCalls/recordModelCall';
import { llmConfigFor, TOOL_LABELS } from '@worker/runs/agentDefinition';
import type { ApiKeys, DelegateDefinition, Toolbox, ToolName } from '@worker/runs/agentDefinition';
import type { RunModels } from '@worker/runs/runGraph';
import { runToolStep, stepIdFor, turnsIn } from '@worker/runs/steps';
import type { StepContext } from '@worker/runs/steps';
import { WebToolError } from '@worker/tools/webToolError';

export type DelegateToolDeps = StepContext & {
  models: RunModels;
  prompts: Prompts;
  apiKeys: ApiKeys;
  timeoutMs: number;
  toolbox: Toolbox;
  /** The tool calls one delegate execution may make; past it the delegate answers with what it has. */
  toolCallCap: number;
};

const taskSchema = z.object({
  task: z
    .string()
    .min(1)
    .describe('The whole task, self-contained: the Agent sees nothing else of the Run'),
});

const sumUsage = (a: CallUsage | undefined, b: CallUsage): CallUsage =>
  a
    ? {
        inputTokens: a.inputTokens + b.inputTokens,
        cachedInputTokens: a.cachedInputTokens + b.cachedInputTokens,
        outputTokens: a.outputTokens + b.outputTokens,
        estimated: a.estimated || b.estimated,
      }
    : b;

// A tool's failure goes back to the delegate as a typed error result; only a stopped Run stops the loop.
const toolErrorResult = (err: unknown, toolCall: { id?: string; name: string }): ToolMessage =>
  new ToolMessage({
    content: JSON.stringify(
      err instanceof WebToolError
        ? { error: err.code, message: err.message }
        : { error: 'tool-failed', message: `The ${toolCall.name} tool failed.` },
    ),
    tool_call_id: toolCall.id ?? '',
    name: toolCall.name,
    status: 'error',
  });

/** The delegate's own `createAgent` loop over its granted tools; each tool call is a Step under the delegate's. */
const runToolLoop = async (
  agent: DelegateDefinition,
  deps: DelegateToolDeps,
  task: string,
  runtime: ToolRuntime<{ messages: BaseMessage[] }>,
  signal: AbortSignal,
): Promise<{ text: string; usage: CallUsage | undefined }> => {
  const system = deps.prompts[agent.prompt];
  // The Orchestrator's tool-call id names the delegate's Step, as in its own middleware.
  const parentStepId = stepIdFor(deps.runId, 'delegate', runtime.toolCallId);
  const turn = turnsIn(runtime.state.messages);
  let usage: CallUsage | undefined;

  const stepRecorder = createMiddleware({
    name: 'DelegateSteps',
    wrapModelCall: async (request, handler) => {
      const used = request.messages
        .filter(AIMessage.isInstance)
        .flatMap((m) => m.tool_calls ?? []).length;
      // At the cap it is offered no tools, so its next reply is its answer from what it has.
      const capped = used >= deps.toolCallCap ? { ...request, tools: [] } : request;
      const reply = await llmConcurrencyLimiter(() => handler(capped));
      const called = toCallUsage(reply.usage_metadata, {
        promptTokens: countTokens(
          [system, ...request.messages.map((m) => m.text)].join('\n'),
          agent.model,
        ),
        completionTokens: countTokens(
          reply.text + JSON.stringify(reply.tool_calls ?? []),
          agent.model,
        ),
      });
      if (called) usage = sumUsage(usage, called);
      return reply;
    },
    wrapToolCall: async (request, handler) => {
      const { toolCall } = request;
      const name = toolCall.name as ToolName;
      try {
        const { output } = await runToolStep(
          deps,
          {
            id: stepIdFor(deps.runId, 'tool', toolCall.id ?? ''),
            name,
            label: TOOL_LABELS[name] ?? name,
            turn,
            parentStepId,
            input: toolCall.args,
            persist: (result: ToolMessage) => ({ result: result.text }),
          },
          // The inner loop's own runtime has no writer; the delegate's carries Step events to the Run's stream.
          runtime.writer ? { writer: runtime.writer } : {},
          async () => (await handler(request)) as ToolMessage,
        );
        return output;
      } catch (err) {
        if (signal.aborted) throw err;
        return toolErrorResult(err, toolCall);
      }
    },
  });

  // No checkpointer: its tools only read, so a crash re-runs the delegate whole rather than resuming inside it.
  const loop = createAgent({
    model: deps.models.chat(llmConfigFor(agent, deps.apiKeys)),
    tools: agent.tools.map((name) => deps.toolbox[name]),
    systemPrompt: system,
    middleware: [
      stepRecorder,
      // Refuses the calls in one reply that would pass the cap. Its zod v3 state schema fails our
      // exactOptionalPropertyTypes, hence the casts.
      toolCallLimitMiddleware({
        runLimit: deps.toolCallCap,
        exitBehavior: 'continue',
      } as never) as unknown as AgentMiddleware,
    ],
    checkpointer: false,
  });
  const result = await loop.invoke(
    { messages: [new HumanMessage(task)] },
    // The Run's stream config carries the Step events up; the cap's turns plus a final answer bound the loop.
    {
      ...(runtime.callbacks ? { callbacks: runtime.callbacks } : {}),
      ...(runtime.configurable ? { configurable: runtime.configurable } : {}),
      signal,
      recursionLimit: (deps.toolCallCap + 3) * 3,
    },
  );
  const reply = result.messages.findLast(AIMessage.isInstance);
  return { text: reply?.text ?? '', usage };
};

// A delegate with no tools is one plain model call; with tools, its own loop. Its answer is the tool result,
// its usage the artifact the Step recorder reads.
export const delegateTool = (agent: DelegateDefinition, deps: DelegateToolDeps) =>
  tool(
    async (
      { task },
      config: ToolRuntime<{ messages: BaseMessage[] }>,
    ): Promise<[string, CallUsage | undefined]> => {
      if (agent.tools.length > 0) {
        const timeout = AbortSignal.timeout(deps.timeoutMs);
        const signal = config.signal ? AbortSignal.any([config.signal, timeout]) : timeout;
        const { text, usage } = await runToolLoop(agent, deps, task, config, signal);
        if (!text.trim()) throw new Error(`The ${agent.name} Agent returned nothing.`);
        return [text, usage];
      }
      const system = deps.prompts[agent.prompt];
      // The timeout starts once the call leaves the process-wide queue, so waiting there costs it nothing.
      const reply = await llmConcurrencyLimiter(() => {
        const timeout = AbortSignal.timeout(deps.timeoutMs);
        const signal = config.signal ? AbortSignal.any([config.signal, timeout]) : timeout;
        return deps.models
          .chat(llmConfigFor(agent, deps.apiKeys))
          .invoke([new SystemMessage(system), new HumanMessage(task)], { signal });
      });
      const usage = toCallUsage(reply.usage_metadata, {
        promptTokens: countTokens(system, agent.model) + countTokens(task, agent.model),
        completionTokens: countTokens(reply.text, agent.model),
      });
      if (!reply.text.trim()) throw new Error(`The ${agent.name} Agent returned nothing.`);
      return [reply.text, usage];
    },
    {
      name: agent.name,
      description: agent.description,
      schema: taskSchema,
      responseFormat: 'content_and_artifact',
    },
  );
