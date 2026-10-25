import type { ModelProvider } from '@nebula-chat/contracts';

export type ProviderType = ModelProvider;

export type LLMConfig = {
  provider: ProviderType;
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
};

// The Model a provider falls back to; every Model's limits and prices are in the catalog (ADR-0030).
export const DEFAULT_MODELS: Record<ProviderType, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-20241022',
};
