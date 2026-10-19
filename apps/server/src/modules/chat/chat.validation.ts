import { z } from 'zod';
import { MODEL_REGISTRY } from '@nebula-chat/langchain';

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
});

export const createChatStreamSchema = z.object({
  messages: z.array(chatMessageSchema).length(1),
  model: z
    .string()
    .refine((m) => Object.hasOwn(MODEL_REGISTRY, m), { message: 'Invalid model name' }),
  sessionId: z.uuid().optional(),
  regenerate: z
    .boolean()
    .optional()
    .default(false)
    .describe('Bypass and overwrite any cached response, forcing a fresh completion'),
});

const meteredMessageAllowanceSchema = z
  .object({
    metered: z.literal(true),
    limit: z.number().int().nonnegative().describe('The configured message allowance'),
    used: z.number().int().nonnegative().describe("The caller's live user-message count"),
    remaining: z
      .number()
      .int()
      .nonnegative()
      .describe('Messages left before the allowance is spent, clamped at 0'),
  })
  .meta({ id: 'MeteredMessageAllowance' });

const unmeteredMessageAllowanceSchema = z
  .object({ metered: z.literal(false) })
  .meta({ id: 'UnmeteredMessageAllowance' });

export const messageAllowanceSchema = z
  .discriminatedUnion('metered', [meteredMessageAllowanceSchema, unmeteredMessageAllowanceSchema])
  .meta({ id: 'MessageAllowance' });
