import type { AgentDefinition } from '@worker/runs/agentDefinition';
import type { Brief } from '@worker/runs/brief';

export const outputAgent = {
  name: 'output',
  label: 'Writing the answer',
  model: 'gpt-4.1',
  prompt: 'output',
  tools: [],
  parameters: { temperature: 0.7 },
} as const satisfies AgentDefinition;

// The Brief goes down as the JSON the Intake Agents produced, not a prose rendering of it.
export const outputInput = (brief: Brief, message: string): string =>
  `# Brief\n\n\`\`\`json\n${JSON.stringify(brief, null, 2)}\n\`\`\`\n\n# The user's message\n\n${message}`;
