import { z } from 'zod';
import type { AgentDefinition } from '@worker/agents/agentDefinition';

export const languageDetection = {
  name: 'languageDetection',
  label: 'Detecting the language',
  model: 'gpt-4o-mini',
  prompt: 'languageDetection',
  tools: [],
  parameters: { temperature: 0 },
} as const satisfies AgentDefinition;

export const languageDetectionSchema = z.object({
  language: z.string().min(1).describe('The language the message is written in, by English name'),
  englishRestatement: z.string().min(1).describe('The message restated faithfully in English'),
});

export type LanguageDetection = z.infer<typeof languageDetectionSchema>;
