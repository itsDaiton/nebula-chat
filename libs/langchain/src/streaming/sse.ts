// Pure SSE string formatters — no Node.js or HTTP transport dependency.
// Consumers (e.g. Fastify routes) write the returned string to their response stream.

import type { ErrorEnvelope } from '@nebula-chat/errors';

const fmt = (event: string, data: unknown): string =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

export const sseConversationCreated = (conversationId: string) =>
  fmt('conversation-created', { conversationId });

export const sseUserMessageCreated = (messageId: string) =>
  fmt('user-message-created', { messageId });

export const sseAssistantMessageCreated = (messageId: string) =>
  fmt('assistant-message-created', { messageId });

export const sseToken = (token: string) => fmt('token', { token });

export const sseUsage = (usage: {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}) => fmt('usage', usage);

export const sseCacheHit = () => fmt('cache-hit', {});

// The same envelope the JSON error handler sends (ADR-0011), so a client reads
// errors one way whichever transport they arrive on.
export const sseError = (envelope: ErrorEnvelope) => fmt('error', envelope);

export const sseEnd = () => fmt('end', {});
