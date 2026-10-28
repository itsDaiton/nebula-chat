import type { ModelOption } from '@/modules/chat/types/types';

export const modelOptions: ModelOption[] = [
  { label: 'GPT-4.1', value: 'gpt-4.1' },
  { label: 'GPT-4.1 mini', value: 'gpt-4.1-mini' },
  { label: 'GPT-4o', value: 'gpt-4o' },
  { label: 'GPT-4o mini', value: 'gpt-4o-mini' },
  { label: 'GPT-5.1', value: 'gpt-5.1' },
  { label: 'GPT-5', value: 'gpt-5' },
  { label: 'GPT-5 mini', value: 'gpt-5-mini' },
];

/** The Model's display name; an id outside the list shows as itself. */
export const getModelLabel = (id: string) =>
  modelOptions.find((option) => option.value === id)?.label ?? id;
