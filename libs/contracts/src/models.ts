import { z } from 'zod';

/**
 * The Models a Session may be bound to. The server validates against this list,
 * so it holds no LLM code (ADR-0013); the usage epic grows it into the full
 * model catalog (ADR-0030). Keep it in step with the worker's model registry.
 */
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
