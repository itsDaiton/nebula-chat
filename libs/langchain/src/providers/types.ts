export type ProviderType = 'openai' | 'anthropic';

export type LLMConfig = {
  provider: ProviderType;
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
};

export type ModelEntry = {
  contextWindow: number;
  defaultMaxOutput: number;
};

// Context window sizes used by packHistory to determine how much history to include.
// Add new models here as providers are expanded.
export const MODEL_REGISTRY: Record<string, ModelEntry> = {
  // OpenAI
  'gpt-4o': { contextWindow: 128_000, defaultMaxOutput: 4_096 },
  'gpt-4o-mini': { contextWindow: 128_000, defaultMaxOutput: 16_384 },
  'gpt-4-turbo': { contextWindow: 128_000, defaultMaxOutput: 4_096 },
  'gpt-4.1': { contextWindow: 128_000, defaultMaxOutput: 8_192 },
  'gpt-4.1-mini': { contextWindow: 128_000, defaultMaxOutput: 8_192 },
  'gpt-5': { contextWindow: 128_000, defaultMaxOutput: 8_192 },
  'gpt-5-mini': { contextWindow: 128_000, defaultMaxOutput: 8_192 },
  // Anthropic
  'claude-3-5-sonnet-20241022': { contextWindow: 200_000, defaultMaxOutput: 8_192 },
  'claude-3-5-haiku-20241022': { contextWindow: 200_000, defaultMaxOutput: 8_192 },
  'claude-3-opus-20240229': { contextWindow: 200_000, defaultMaxOutput: 4_096 },
};

export const DEFAULT_MODELS: Record<ProviderType, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-20241022',
};
