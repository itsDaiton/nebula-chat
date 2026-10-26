import type { AgentDefinition } from '@worker/agents/agentDefinition';
import type { Brief } from '@worker/runs/brief';

export const output = {
  name: 'output',
  label: 'Writing the answer',
  model: 'gpt-4.1',
  prompt: 'output',
  tools: [],
  parameters: { temperature: 0.7 },
} as const satisfies AgentDefinition;

export const outputInput = (brief: Brief, message: string): string =>
  [
    '# Brief',
    `- Language: ${brief.language ?? '(unknown: answer in the language of the message)'}`,
    `- English restatement: ${brief.englishRestatement ?? '(missing)'}`,
    `- Session summary: ${brief.sessionSummary ?? '(missing)'}`,
    '',
    "# The user's message",
    '',
    message,
  ].join('\n');
