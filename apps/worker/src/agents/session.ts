import { z } from 'zod';
import type { HistoryMessage } from '@worker/directReplies/streamChat';
import type { AgentDefinition } from '@worker/runs/agentDefinition';

export const sessionAgent = {
  name: 'session',
  label: 'Summarising the Session',
  model: 'gpt-4o-mini',
  prompt: 'session',
  tools: [],
  parameters: { temperature: 0 },
} as const satisfies AgentDefinition;

export const sessionSchema = z.object({
  summary: z.string().describe('What the conversation so far established for the latest message'),
});

export type SessionOutput = z.infer<typeof sessionSchema>;

const SPEAKERS: Record<HistoryMessage['role'], string> = { user: 'User', assistant: 'Assistant' };

export const sessionInput = (history: HistoryMessage[], message: string): string => {
  const transcript = history.length
    ? history.map(({ role, content }) => `${SPEAKERS[role]}: ${content}`).join('\n\n')
    : '(no earlier messages)';
  return `# Conversation so far\n\n${transcript}\n\n# Latest message\n\n${message}`;
};
