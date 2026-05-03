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
  provider: ProviderType;
  contextWindow: number;
  defaultMaxOutput: number;
};

// Context window sizes used by packHistory to determine how much history to include.
// Add new models here as providers are expanded.
export const MODEL_REGISTRY: Record<string, ModelEntry> = {
  // OpenAI
  'gpt-4o': { provider: 'openai', contextWindow: 128_000, defaultMaxOutput: 4_096 },
  'gpt-4o-mini': { provider: 'openai', contextWindow: 128_000, defaultMaxOutput: 16_384 },
  'gpt-4-turbo': { provider: 'openai', contextWindow: 128_000, defaultMaxOutput: 4_096 },
  'gpt-4.1': { provider: 'openai', contextWindow: 128_000, defaultMaxOutput: 8_192 },
  'gpt-4.1-mini': { provider: 'openai', contextWindow: 128_000, defaultMaxOutput: 8_192 },
  'gpt-5': { provider: 'openai', contextWindow: 128_000, defaultMaxOutput: 8_192 },
  'gpt-5-mini': { provider: 'openai', contextWindow: 128_000, defaultMaxOutput: 8_192 },
  // Anthropic
  'claude-3-5-sonnet-20241022': {
    provider: 'anthropic',
    contextWindow: 200_000,
    defaultMaxOutput: 8_192,
  },
  'claude-3-5-haiku-20241022': {
    provider: 'anthropic',
    contextWindow: 200_000,
    defaultMaxOutput: 8_192,
  },
  'claude-3-opus-20240229': {
    provider: 'anthropic',
    contextWindow: 200_000,
    defaultMaxOutput: 4_096,
  },
};

export const getProviderForModel = (model: string): ProviderType => {
  const entry = MODEL_REGISTRY[model];
  if (!entry) throw new Error(`Unknown model: ${model}`);
  return entry.provider;
};

export const DEFAULT_MODELS: Record<ProviderType, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-20241022',
};
