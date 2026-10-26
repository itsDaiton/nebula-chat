import { AIMessage, ToolMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { createAgent, createMiddleware } from 'langchain';
import pLimit from 'p-limit';
import { componentLogger, logEvent } from '@nebula-chat/otel';
import { orchestratorAgent } from '@worker/agents/orchestrator';
import { toCallUsage } from '@worker/llm/callUsage';
import { countTokens } from '@worker/llm/countTokens';
import type { CallUsage } from '@worker/modelCalls/recordModelCall';
import { llmConfigFor } from '@worker/runs/agentDefinition';
import { DELEGATES } from '@worker/runs/agentRegistry';
import { delegateTool } from '@worker/runs/delegateTool';
import type { DelegateToolDeps } from '@worker/runs/delegateTool';
import { runModelStep, stepIdFor } from '@worker/runs/steps';
import type { StepContext } from '@worker/runs/steps';

/** The limits on one Run's Orchestrator loop; env config in production. */
export type RunLimits = {
  turnCap: number;
  parallelDelegates: number;
  tokenBudget: number;
  handoffThreshold: number;
  delegateTimeoutMs: number;
};

/** How the loop ended: the Orchestrator handed off itself, or a limit made it. */
export type LoopEnding = 'handoff' | 'turn-cap' | 'budget';

export type OrchestratorDeps = StepContext &
  Omit<DelegateToolDeps, 'timeoutMs'> & {
    limits: RunLimits;
    /** Throws, having aborted the Run, when its User asked to stop it. */
    checkCancelled: () => Promise<void>;
  };

// A turn is three graph steps (hook, model, tools); the turn cap ends the loop well before this backstop.
const recursionLimitFor = (turnCap: number): number => (turnCap + 1) * 5;

// The turn a message list is on: one Orchestrator reply per earlier turn, so it survives a resume.
const turnsIn = (messages: BaseMessage[]): number => messages.filter(AIMessage.isInstance).length;

const transcript = (messages: BaseMessage[]) =>
  messages.map((m) => ({
    type: m.type,
    content: m.text,
    ...(AIMessage.isInstance(m) && m.tool_calls?.length ? { toolCalls: m.tool_calls } : {}),
    ...(ToolMessage.isInstance(m) ? { toolCallId: m.tool_call_id } : {}),
  }));

// A `createAgent` loop whose only tools are the delegate Agents; its middleware records Steps and enforces the limits.
export const createOrchestrator = (deps: OrchestratorDeps) => {
  const { limits, runId } = deps;
  const agent = orchestratorAgent;
  const system = deps.prompts[agent.prompt];
  const turnStepId = (turn: number): string => stepIdFor(runId, 'orchestrator', `turn:${turn}`);
  const nearBudget = (): boolean =>
    deps.tally.tokens >= limits.tokenBudget * limits.handoffThreshold;
  // Bounds the delegates in flight at once, whatever one turn asks for.
  const delegateSlots = pLimit(limits.parallelDelegates);
  let ending: LoopEnding = 'handoff';
  const failedDelegates: string[] = [];

  const runControl = createMiddleware({
    name: 'RunControl',
    beforeModel: {
      canJumpTo: ['end'],
      hook: async (state) => {
        await deps.checkCancelled();
        // Ends the loop rather than throwing: the Output Agent still answers, from partial findings.
        if (turnsIn(state.messages) >= limits.turnCap) ending = 'turn-cap';
        else if (nearBudget()) ending = 'budget';
        else return undefined;
        return { jumpTo: 'end' };
      },
    },
    wrapModelCall: async (request, handler) => {
      const turn = turnsIn(request.messages) + 1;
      const { output } = await runModelStep(
        deps,
        {
          phase: 'orchestrator',
          agent,
          id: turnStepId(turn),
          turn,
          input: {
            model: agent.model,
            parameters: agent.parameters,
            system,
            messages: transcript(request.messages),
          },
          persist: (reply: AIMessage) => ({ content: reply.text, toolCalls: reply.tool_calls }),
        },
        request.runtime,
        async (reportUsage) => {
          const reply = await handler(request);
          const usage = toCallUsage(reply.usage_metadata, {
            promptTokens: countTokens(
              [system, ...request.messages.map((m) => m.text)].join('\n'),
              agent.model,
            ),
            completionTokens: countTokens(
              reply.text + JSON.stringify(reply.tool_calls ?? []),
              agent.model,
            ),
          });
          if (usage) reportUsage(usage);
          return reply;
        },
      );
      return output;
    },
    wrapToolCall: async (request, handler) => {
      const { toolCall } = request;
      const delegate = DELEGATES.find((d) => d.name === toolCall.name);
      const toolCallId = toolCall.id ?? '';
      const errorResult = (content: string) =>
        new ToolMessage({
          content,
          tool_call_id: toolCallId,
          name: toolCall.name,
          status: 'error',
        });
      if (!delegate) return handler(request);
      if (nearBudget()) return errorResult('Not run: the Run budget is nearly spent.');

      const turn = turnsIn(request.state.messages);
      const task = typeof toolCall.args['task'] === 'string' ? toolCall.args['task'] : '';
      try {
        const { output } = await delegateSlots(() =>
          runModelStep(
            deps,
            {
              phase: 'delegate',
              agent: delegate,
              // The tool-call id is checkpointed with the Orchestrator's reply, so a re-run finds its Step.
              id: stepIdFor(runId, 'delegate', toolCallId),
              turn,
              parentStepId: turnStepId(turn),
              input: {
                toolCallId,
                model: delegate.model,
                parameters: delegate.parameters,
                system: deps.prompts[delegate.prompt],
                task,
              },
              persist: (result: ToolMessage) => ({ result: result.text }),
            },
            request.runtime,
            async (reportUsage) => {
              const result = (await handler(request)) as ToolMessage;
              const usage = result.artifact as CallUsage | undefined;
              if (usage) reportUsage(usage);
              return result;
            },
          ),
        );
        return output;
      } catch (err) {
        // A stopped Run stops here too; any other failure is the Orchestrator's to work around.
        if (request.runtime.signal?.aborted) throw err;
        failedDelegates.push(delegate.name);
        const outcome =
          err instanceof Error && err.name === 'TimeoutError' ? 'timed out' : 'failed';
        logEvent(
          componentLogger(deps.logger, 'chat'),
          'warn',
          'chat.run.step.failed',
          { err, 'nebula.agent.name': delegate.name },
          `Delegate Agent ${delegate.name} ${outcome}; the Orchestrator carries on`,
        );
        return errorResult(`The ${delegate.name} Agent ${outcome} and returned no result.`);
      }
    },
  });

  const loop = createAgent({
    model: deps.models.chat(llmConfigFor(agent, deps.apiKeys)),
    tools: DELEGATES.map((delegate) =>
      delegateTool(delegate, { ...deps, timeoutMs: limits.delegateTimeoutMs }),
    ),
    systemPrompt: system,
    middleware: [runControl],
  });

  return {
    loop,
    recursionLimit: recursionLimitFor(limits.turnCap),
    ending: () => ending,
    failedDelegates: () => failedDelegates,
  };
};
