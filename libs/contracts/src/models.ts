import { z } from 'zod';

// The Models a Session may be bound to, so the server validates without LLM code (ADR-0013).
// The worker's tests fail if one has no provider in its registry; ADR-0030 grows it into the catalog.
export const MODEL_IDS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-5',
  'gpt-5-mini',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
] as const;

export const modelIdSchema = z.enum(MODEL_IDS);

export type ModelId = z.infer<typeof modelIdSchema>;
