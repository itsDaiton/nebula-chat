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
  // Profile image storage
  'profile_image.delete.failed',
  'profile_image.orphaned',
  // Redis
  'redis.connection.failed',
  'redis.connection.restored',
  // Postgres
  'db.connection.failed',
  // Lifecycle
  'server.started',
  'server.start.failed',
  'server.shutdown.failed',
  'redis.connect.failed',
  'otel.started',
  'otel.start.failed',
  'otel.log_export.failed',
  'otel.log_export.restored',
  'env.file.missing',
  // Log control
  'log.level.changed',
  'log.level.reverted',
  'log.level.message.rejected',
  'log.level.listen.failed',
  // Adapters
  'auth.library.log',
  'otel.diag.log',
  'fastify.log',
] as const;

export type LogEventName = (typeof LOG_EVENTS)[number];
