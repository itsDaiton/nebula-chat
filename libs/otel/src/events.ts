/**
 * The event catalogue: every `event.name` a line may carry. Stable dotted
 * identifiers to filter and alert on — renaming one breaks whoever queries it,
 * so add new names rather than repurposing old ones.
 *
 * The `*.log` names are generic: adapters stamp them on lines a third-party
 * logger (better-auth, the OTel SDK, Fastify internals) wrote in its own words.
 */
export const LOG_EVENTS = [
  // HTTP
  'http.request.received',
  'http.request.completed',
  'http.request.failed',
  // Chat
  'chat.reply.completed',
  // LLM
  'llm.stream.started',
  'llm.stream.finished',
  // Cache
  'cache.hit',
  'cache.saved',
  'cache.read.failed',
  'cache.write.failed',
  'cache.delete.failed',
  'cache.clear.failed',
  'cache.check.failed',
  'cache.capture.failed',
  'cache.entry.unparseable',
  // Lifecycle
  'server.started',
  'server.start.failed',
  'server.shutdown.failed',
  'otel.start.failed',
  'env.file.missing',
  // Adapters
  'auth.library.log',
  'otel.diag.log',
  'fastify.log',
] as const;

export type LogEventName = (typeof LOG_EVENTS)[number];
