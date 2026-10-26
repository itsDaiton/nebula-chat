import { z } from 'zod';
import { modelIdSchema } from '@nebula-chat/contracts';

export const sendMessageParamsSchema = z.object({
  sessionId: z.uuid(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1),
  mode: z
    .enum(['direct', 'run'])
    .describe(
      'How the reply is produced: `direct`, a Direct reply, or `run`, a Run (Registered users only).',
    ),
  model: modelIdSchema
    .optional()
    .describe("Binds the Session to this Model before replying; omitted keeps the Session's Model"),
});

export const sentMessageSchema = z
  .object({
    messageId: z.uuid().describe('The persisted user Message'),
    streamId: z.uuid().describe('The reply stream to read from `GET /api/streams/{streamId}`'),
    runId: z.uuid().optional().describe('The Run producing the reply; only in `run` mode'),
  })
  .meta({ id: 'SentMessage' });

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
