import { z } from 'zod';
import type { AgentDefinition } from '@worker/runs/agentDefinition';

export const languageAgent = {
  name: 'language',
  label: 'Detecting the language',
  model: 'gpt-4o-mini',
  prompt: 'language',
  tools: [],
  parameters: { temperature: 0 },
} as const satisfies AgentDefinition;

export const languageSchema = z.object({
  language: z.string().min(1).describe('The language the message is written in, by English name'),
  englishRestatement: z.string().min(1).describe('The message restated faithfully in English'),
});

export type LanguageOutput = z.infer<typeof languageSchema>;
