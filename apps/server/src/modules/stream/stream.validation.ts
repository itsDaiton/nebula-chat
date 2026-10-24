import { z } from 'zod';

export const streamParamsSchema = z.object({
  streamId: z.uuid(),
});

// A stream entry id (`<ms>-<seq>`), as each SSE event's `id` carries it.
const streamEntryIdSchema = z.string().regex(/^\d+-\d+$/, 'Expected a stream entry id');

export const replyStreamQuerySchema = z.object({
  lastEventId: streamEntryIdSchema
    .optional()
    .describe('Resume after this event id, for a client reconnecting by hand'),
});

// Loose: the auth session's cookie and every other header must survive validation.
export const replyStreamHeadersSchema = z.looseObject({
  'last-event-id': streamEntryIdSchema
    .optional()
    .describe('Resume after this event id; sent by an EventSource when it reconnects'),
});

export const replyStreamSchema = z
  .string()
  .describe(
    "Server-sent events: `token` ({ token }), `usage` ({ promptTokens, completionTokens, totalTokens }), `error` (the ErrorEnvelope) and a final `end` ({}, or { reason: 'cancelled' } for a reply its User stopped). Each event `id` is its stream entry id; send the last one back as `Last-Event-ID` (or `lastEventId`) to resume after it.",
  );
