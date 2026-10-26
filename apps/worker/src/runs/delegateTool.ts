import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { llmConcurrencyLimiter } from '@worker/llm/concurrencyLimiter';
import { countTokens } from '@worker/llm/countTokens';
import { toCallUsage } from '@worker/llm/callUsage';
import type { Prompts } from '@worker/llm/prompts';
import type { CallUsage } from '@worker/modelCalls/recordModelCall';
import { llmConfigFor } from '@worker/runs/agentDefinition';
import type { ApiKeys, DelegateDefinition } from '@worker/runs/agentDefinition';
import type { RunModels } from '@worker/runs/runGraph';

export type DelegateToolDeps = {
  models: RunModels;
  prompts: Prompts;
  apiKeys: ApiKeys;
  timeoutMs: number;
};

const taskSchema = z.object({
  task: z
    .string()
    .min(1)
    .describe('The whole task, self-contained: the Agent sees nothing else of the Run'),
});

/**
 * A delegate Agent as a tool taking `{ task }`: one plain model call, its answer the tool result and
 * its usage the artifact, so the Step recorder can record the Model call.
 */
export const delegateTool = (agent: DelegateDefinition, deps: DelegateToolDeps) =>
  tool(
    async ({ task }, config): Promise<[string, CallUsage | undefined]> => {
      const system = deps.prompts[agent.prompt];
      const timeout = AbortSignal.timeout(deps.timeoutMs);
      const signal = config.signal ? AbortSignal.any([config.signal, timeout]) : timeout;
      const reply = await llmConcurrencyLimiter(() =>
        deps.models
          .chat(llmConfigFor(agent, deps.apiKeys))
          .invoke([new SystemMessage(system), new HumanMessage(task)], { signal }),
      );
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
