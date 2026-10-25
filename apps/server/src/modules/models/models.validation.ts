import { z } from 'zod';
import { modelIdSchema, modelProviderSchema } from '@nebula-chat/contracts';

const modelPricesSchema = z
  .object({
    input: z.number().describe('USD per million input tokens'),
    cachedInput: z.number().describe('USD per million input tokens served from the prompt cache'),
    output: z.number().describe('USD per million output tokens'),
  })
  .meta({ id: 'ModelPrices' });

const modelResponseSchema = z
  .object({
    id: modelIdSchema,
    label: z.string().describe('The name people see, e.g. "GPT-4.1 mini"'),
    provider: modelProviderSchema,
    contextWindow: z.number().int().positive().describe('Tokens the Model can take in'),
    maxOutput: z.number().int().positive().describe('Tokens reserved for a reply'),
    prices: modelPricesSchema,
  })
  .meta({ id: 'Model' });

export const modelsArraySchema = z.array(modelResponseSchema).max(100);
