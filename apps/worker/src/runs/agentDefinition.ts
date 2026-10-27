import { getModel } from '@nebula-chat/contracts';
import type { ModelProvider } from '@nebula-chat/contracts';
import { MissingConfigurationError } from '@nebula-chat/errors';
import type { LLMConfig } from '@worker/llm/createLLM';
import type { PromptName } from '@worker/llm/prompts';

/** A named, predefined role (CONTEXT.md): versioned in git, never invented at run time. */
export type AgentDefinition = {
  name: string;
  /** The short label a Step of this Agent shows in the UI. */
  label: string;
  /** A Model in the catalog in `@nebula-chat/contracts`. */
  model: string;
  prompt: PromptName;
  /** The tools it may call; none until the web tools. */
  tools: readonly string[];
  parameters: { temperature: number; maxTokens?: number };
};

/** An Agent the Orchestrator may delegate to: it sees the Agent as a tool described by `description`. */
export type DelegateDefinition = AgentDefinition & { description: string };

export type ApiKeys = { [P in ModelProvider]?: string | undefined };

export const llmConfigFor = (agent: AgentDefinition, apiKeys: ApiKeys): LLMConfig => {
  const { provider } = getModel(agent.model);
  const apiKey = apiKeys[provider];
  if (!apiKey) {
    throw new MissingConfigurationError(
      provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY',
    );
  }
  return { provider, apiKey, model: agent.model, ...agent.parameters };
};

// Everything the model was sent, so a Step can be inspected on its own.
export const stepInput = (agent: AgentDefinition, system: string, human: string) => ({
  model: agent.model,
  parameters: agent.parameters,
  system,
  human,
});
