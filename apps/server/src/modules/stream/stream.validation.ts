import { z } from 'zod';

export const streamParamsSchema = z.object({
  streamId: z.uuid(),
});

export const replyStreamSchema = z
  .string()
  .describe(
    'Server-sent events: `token` ({ token }), `usage` ({ promptTokens, completionTokens, totalTokens }), `error` (the ErrorEnvelope) and a final `end` ({}). Each event `id` is its stream entry id.',
  );
