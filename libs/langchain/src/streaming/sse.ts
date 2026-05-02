// Pure SSE string formatters — no Node.js or HTTP transport dependency.
// Consumers (e.g. Fastify routes) write the returned string to their response stream.

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

export const sseError = (message: string) => fmt('error', { error: message });

export const sseEnd = () => fmt('end', {});
