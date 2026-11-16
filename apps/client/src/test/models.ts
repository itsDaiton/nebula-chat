import type { ModelCatalog } from '@/libs/api/generated/model/modelCatalog';
import type { ModelId } from '@/libs/api/generated/model/modelId';

const prices = { input: 1, cachedInput: 0.5, output: 4 };

const openai = (id: ModelId, label: string, contextWindow: number, maxOutput: number) => ({
  id,
  label,
  provider: 'openai' as const,
  contextWindow,
  maxOutput,
  supportsTemperature: true,
  prices,
});

/** A small catalog in the shape `GET /api/models` serves. */
export const testCatalog: ModelCatalog = {
  version: '2026-01-01-11111111-1111-4111-8111-111111111111',
  hash: 'a'.repeat(64),
  defaultModels: { openai: 'gpt-4o-mini', anthropic: 'claude-3-5-haiku-20241022' },
  models: [
    openai('gpt-4.1', 'GPT-4.1', 1_047_576, 32_768),
    openai('gpt-4.1-mini', 'GPT-4.1 mini', 1_047_576, 32_768),
    openai('gpt-4o', 'GPT-4o', 128_000, 16_384),
    openai('gpt-4o-mini', 'GPT-4o mini', 128_000, 16_384),
    openai('gpt-5', 'GPT-5', 400_000, 128_000),
    openai('gpt-5-mini', 'GPT-5 mini', 400_000, 128_000),
    {
      id: 'claude-3-5-haiku-20241022',
      label: 'Claude 3.5 Haiku',
      provider: 'anthropic',
      contextWindow: 200_000,
      maxOutput: 8_192,
      supportsTemperature: true,
      prices,
    },
  ],
};
