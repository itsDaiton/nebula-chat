import type { DelegateDefinition } from '@worker/runs/agentDefinition';

// The one Agent with the web: it searches and reads pages in its own loop, then reports what it found.
export const researcherAgent = {
  name: 'researcher',
  label: 'Researching',
  description:
    'Looks things up on the web and reports what current or external sources say, with their URLs. Use it for recent events, facts to check, or anything beyond general knowledge.',
  model: 'gpt-4.1-mini',
  prompt: 'researcher',
  tools: ['web_search', 'web_fetch'],
  parameters: { temperature: 0.2 },
} as const satisfies DelegateDefinition;
