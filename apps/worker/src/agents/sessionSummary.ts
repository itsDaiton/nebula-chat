import { z } from 'zod';
import type { AgentDefinition } from '@worker/runs/agentDefinition';
import type { HistoryMessage } from '@worker/directReplies/streamChat';

export const sessionSummary = {
  name: 'sessionSummary',
  label: 'Summarising the Session',
  model: 'gpt-4o-mini',
  prompt: 'sessionSummary',
  tools: [],
  parameters: { temperature: 0 },
} as const satisfies AgentDefinition;

export const sessionSummarySchema = z.object({
  summary: z.string().describe('What the conversation so far established for the latest message'),
});

export type SessionSummary = z.infer<typeof sessionSummarySchema>;

const SPEAKERS: Record<HistoryMessage['role'], string> = { user: 'User', assistant: 'Assistant' };

export const sessionSummaryInput = (history: HistoryMessage[], message: string): string => {
  const transcript = history.length
    ? history.map(({ role, content }) => `${SPEAKERS[role]}: ${content}`).join('\n\n')
    : '(no earlier messages)';
  return `# Conversation so far\n\n${transcript}\n\n# Latest message\n\n${message}`;
};
