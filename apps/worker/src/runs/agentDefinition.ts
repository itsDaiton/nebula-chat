import type { StructuredToolInterface } from '@langchain/core/tools';
import { getModel } from '@nebula-chat/contracts';
import type { LLMConfig } from '@worker/llm/createLLM';
import type { KeyResolver } from '@worker/llm/keyResolver';
import type { PromptName } from '@worker/llm/prompts';

/** The tools an Agent may be granted; only delegates are, so the Orchestrator never calls one itself. */
export type ToolName = 'web_search' | 'web_fetch';

/** Every tool, built once from config: a delegate is given the ones it is granted. */
export type Toolbox = Record<ToolName, StructuredToolInterface>;

export const TOOL_LABELS: Record<ToolName, string> = {
  web_search: 'Searching the web',
  web_fetch: 'Reading a page',
};

/** A named, predefined role (GLOSSARY.md): versioned in git, never invented at run time. */
export type AgentDefinition = {
  name: string;
  /** The short label a Step of this Agent shows in the UI. */
  label: string;
  /** A Model in the catalog in `@nebula-chat/contracts`. */
  model: string;
  prompt: PromptName;
  /** The tools it may call; a delegate with any runs its own capped tool-calling loop. */
  tools: readonly ToolName[];
  parameters: { temperature: number; maxTokens?: number };
};

/** An Agent the Orchestrator may delegate to: it sees the Agent as a tool described by `description`. */
export type DelegateDefinition = AgentDefinition & { description: string };

// Agents state the temperature they would like; the catalog says whether the Model takes it.
const sentParameters = ({ model, parameters }: AgentDefinition): Partial<typeof parameters> => {
  const sent: Partial<typeof parameters> = { ...parameters };
  if (!getModel(model).supportsTemperature) delete sent.temperature;
  return sent;
};

export const llmConfigFor = async (
  agent: AgentDefinition,
  keys: KeyResolver,
): Promise<LLMConfig> => {
  const { provider } = getModel(agent.model);
  return {
    provider,
    apiKey: await keys.keyFor(provider),
    model: agent.model,
    ...sentParameters(agent),
  };
};

// Everything the model was sent, so a Step can be inspected on its own.
export const stepInput = (agent: AgentDefinition, system: string, human: string) => ({
  model: agent.model,
  parameters: sentParameters(agent),
  system,
  human,
});
