import type { PromptName } from '@worker/llm/prompts';

/** A named, predefined role (CONTEXT.md): versioned in git, never invented at run time. */
export type AgentDefinition = {
  name: string;
  /** The short label a Step of this Agent shows in the UI. */
  label: string;
  /** A Model in the catalog in `@nebula-chat/contracts`. */
  model: string;
  /** Its system prompt in `resources/prompts/`. */
  prompt: PromptName;
  /** The tools it may call; none until the Orchestrator's delegates. */
  tools: readonly string[];
  parameters: { temperature: number; maxTokens?: number };
};
