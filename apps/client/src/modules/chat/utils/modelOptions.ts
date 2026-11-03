import type { ModelOption } from '@/modules/chat/types/types';

// Shaped like the catalog `GET /api/models` will serve, so switching later is a data-source change.
export const modelOptions: ModelOption[] = [
  {
    label: 'GPT-4.1',
    value: 'gpt-4.1',
    provider: 'openai',
    contextWindow: 1_047_576,
    maxOutput: 32_768,
  },
  {
    label: 'GPT-4.1 mini',
    value: 'gpt-4.1-mini',
    provider: 'openai',
    contextWindow: 1_047_576,
    maxOutput: 32_768,
  },
  {
    label: 'GPT-4o',
    value: 'gpt-4o',
    provider: 'openai',
    contextWindow: 128_000,
    maxOutput: 16_384,
  },
  {
    label: 'GPT-4o mini',
    value: 'gpt-4o-mini',
    provider: 'openai',
    contextWindow: 128_000,
    maxOutput: 16_384,
  },
  {
    label: 'GPT-5.1',
    value: 'gpt-5.1',
    provider: 'openai',
    contextWindow: 400_000,
    maxOutput: 128_000,
  },
  {
    label: 'GPT-5',
    value: 'gpt-5',
    provider: 'openai',
    contextWindow: 400_000,
    maxOutput: 128_000,
  },
  {
    label: 'GPT-5 mini',
    value: 'gpt-5-mini',
    provider: 'openai',
    contextWindow: 400_000,
    maxOutput: 128_000,
  },
  {
    label: 'Claude 3.5 Haiku',
    value: 'claude-3-5-haiku-20241022',
    provider: 'anthropic',
    contextWindow: 200_000,
    maxOutput: 8_192,
  },
];

const getModelOption = (id: string) => modelOptions.find((option) => option.value === id);

/** The Model's display name; an id outside the list shows as itself. */
export const getModelLabel = (id: string) => getModelOption(id)?.label ?? id;

/** 128000 → "128K", 1047576 → "1M". */
export const formatContextWindow = (tokens: number) =>
  tokens >= 1_000_000 ? `${Math.round(tokens / 1_000_000)}M` : `${Math.round(tokens / 1_000)}K`;
