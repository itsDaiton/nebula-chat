import { z } from 'zod';
import { errorEnvelopeSchema } from '@nebula-chat/errors';

const tokenEventSchema = z.object({ type: z.literal('token'), token: z.string() });

const usageEventSchema = z.object({
  type: z.literal('usage'),
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
});

// The same envelope the JSON error handler sends (ADR-0011), so a client reads errors one way.
const errorEventSchema = errorEnvelopeSchema.extend({ type: z.literal('error') });

const endEventSchema = z.object({ type: z.literal('end') });

// One reply stream entry (ADR-0014), relayed as an SSE event named `type` with the rest as data.
// A stream always finishes with `end`, after an `error` too.
export const replyStreamEventSchema = z.discriminatedUnion('type', [
  tokenEventSchema,
  usageEventSchema,
  errorEventSchema,
  endEventSchema,
]);

export type ReplyStreamEvent = z.infer<typeof replyStreamEventSchema>;

export type ReplyStreamEventType = ReplyStreamEvent['type'];

/** The string stored in a stream entry. */
export const serializeReplyStreamEvent = (event: ReplyStreamEvent): string =>
  JSON.stringify(replyStreamEventSchema.parse(event));

/** The event a stream entry holds, or `null` when it is not valid JSON or not an event. */
export const parseReplyStreamEvent = (raw: string): ReplyStreamEvent | null => {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = replyStreamEventSchema.safeParse(value);
  return result.success ? result.data : null;
};
