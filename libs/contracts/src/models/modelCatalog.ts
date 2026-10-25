import { z } from 'zod';

// Aligned with the worker's provider factory (`createLLM`).
export const modelProviderSchema = z.enum(['openai', 'anthropic']);

export type ModelProvider = z.infer<typeof modelProviderSchema>;

/** USD per million tokens. `cachedInput` is what a token served from the provider's prompt cache costs. */
export type ModelPrices = {
  input: number;
  cachedInput: number;
  output: number;
};

export type Model = {
  id: string;
  label: string;
  provider: ModelProvider;
  contextWindow: number;
  /** The output tokens a call reserves; packHistory leaves this much room below the context window. */
  maxOutput: number;
  prices: ModelPrices;
};

// Prices are code, so a change is a reviewed commit; checked 2026-10-25, except the retired Claude 3.5 Sonnet and 3 Opus (last published rates).
// GPT-4 Turbo has no cache discount, so its cached rate equals its input rate.
export const MODEL_CATALOG = [
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128_000,
    maxOutput: 4_096,
    prices: { input: 2.5, cachedInput: 1.25, output: 10 },
  },
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o mini',
    provider: 'openai',
    contextWindow: 128_000,
    maxOutput: 16_384,
    prices: { input: 0.15, cachedInput: 0.075, output: 0.6 },
  },
  {
    id: 'gpt-4-turbo',
    label: 'GPT-4 Turbo',
    provider: 'openai',
    contextWindow: 128_000,
    maxOutput: 4_096,
    prices: { input: 10, cachedInput: 10, output: 30 },
  },
  {
    id: 'gpt-4.1',
    label: 'GPT-4.1',
    provider: 'openai',
    contextWindow: 128_000,
    maxOutput: 8_192,
    prices: { input: 2, cachedInput: 0.5, output: 8 },
  },
  {
    id: 'gpt-4.1-mini',
    label: 'GPT-4.1 mini',
    provider: 'openai',
    contextWindow: 128_000,
    maxOutput: 8_192,
    prices: { input: 0.4, cachedInput: 0.1, output: 1.6 },
  },
  {
    id: 'gpt-5',
    label: 'GPT-5',
    provider: 'openai',
    contextWindow: 128_000,
    maxOutput: 8_192,
    prices: { input: 1.25, cachedInput: 0.125, output: 10 },
  },
  {
    id: 'gpt-5-mini',
    label: 'GPT-5 mini',
    provider: 'openai',
    contextWindow: 128_000,
    maxOutput: 8_192,
    prices: { input: 0.25, cachedInput: 0.025, output: 2 },
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    label: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    contextWindow: 200_000,
    maxOutput: 8_192,
    prices: { input: 3, cachedInput: 0.3, output: 15 },
  },
  {
    id: 'claude-3-5-haiku-20241022',
    label: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    contextWindow: 200_000,
    maxOutput: 8_192,
    prices: { input: 0.8, cachedInput: 0.08, output: 4 },
  },
  {
    id: 'claude-3-opus-20240229',
    label: 'Claude 3 Opus',
    provider: 'anthropic',
    contextWindow: 200_000,
    maxOutput: 4_096,
    prices: { input: 15, cachedInput: 1.5, output: 75 },
  },
] as const satisfies readonly Model[];

export type ModelId = (typeof MODEL_CATALOG)[number]['id'];

// `map` loses the tuple shape `z.enum` needs; the ids are still exactly the catalog's.
export const MODEL_IDS = MODEL_CATALOG.map((model) => model.id) as [ModelId, ...ModelId[]];

export const modelIdSchema = z.enum(MODEL_IDS);

export const findModel = (id: string): Model | undefined =>
  MODEL_CATALOG.find((model) => model.id === id);

export const getModel = (id: string): Model => {
  const model = findModel(id);
  if (!model) throw new Error(`Unknown model: ${id}`);
  return model;
};
