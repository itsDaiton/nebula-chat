import type { DelegateDefinition } from '@worker/runs/agentDefinition';

export const criticAgent = {
  name: 'critic',
  label: 'Reviewing',
  description:
    'Reviews a draft, plan or claim for errors, gaps and weak reasoning, and says how to fix them. Put the work to review in the task.',
  model: 'gpt-4.1-mini',
  prompt: 'critic',
  tools: [],
  parameters: { temperature: 0.2 },
} as const satisfies DelegateDefinition;
