import type { DelegateDefinition } from '@worker/runs/agentDefinition';

export const analystAgent = {
  name: 'analyst',
  label: 'Analysing',
  description:
    'Works through a question or problem step by step and reports a reasoned conclusion. Give it everything it needs in the task.',
  model: 'gpt-4.1-mini',
  prompt: 'analyst',
  tools: [],
  parameters: { temperature: 0.3 },
} as const satisfies DelegateDefinition;
