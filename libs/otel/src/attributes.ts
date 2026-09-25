/**
 * The attribute catalogue: every key a log line may carry, with its value type.
 *
 * Keys are flat dotted strings, never nested objects — Pino does not deep-merge,
 * so a bound `user: {…}` plus a call-site `user: {…}` would emit a duplicate
 * JSON key. They follow OpenTelemetry semantic conventions where one exists and
 * use `nebula.*` for domain concepts. The one nested value is `err`, which stays
 * an object so Pino's serializer emits its type, message, stack and cause.
 *
 * The Session is `nebula.session.id`, never `session.id`: OTel's `session.id`
 * means a client browsing session, and the codebase already has an auth session.
 *
 * @see https://opentelemetry.io/docs/specs/semconv/
 */

/**
 * The subsystems a line can come from, bound as `nebula.component` by
 * `componentLogger`. Also the names `levelOverrides` keys on.
 */
export type LogComponent = 'auth' | 'chat' | 'http' | 'llm' | 'otel' | 'redis';

export type LogAttributeValues = {
  // Service (also stamped as base fields by createLogger)
  'service.name': string;
  'service.version': string;
  'deployment.environment.name': string;
  // Request
  'http.request.method': string;
  'url.path': string;
  /** The matched route template (`/api/conversations/:conversationId`), not the raw path. */
  'http.route': string;
  'http.response.status_code': number;
  'http.request.id': string;
  'server.address': string;
  'server.port': number;
  // Error
  err: unknown;
  /**
   * The classification the caller was told: the `AppError` code, `Internal` when
   * unclassified. The class name is already in `err.type`.
   */
  'error.type': string;
  // LLM
  'gen_ai.provider.name': string;
  'gen_ai.request.model': string;
  'gen_ai.usage.input_tokens': number;
  'gen_ai.usage.output_tokens': number;
  // User
  'user.id': string;
  'nebula.user.kind': 'guest' | 'registered';
  // Domain
  'nebula.session.id': string;
  /** The user Message a unit of work answers. */
  'nebula.message.id': string;
  /** The assistant Message a Direct reply produced. */
  'nebula.reply.message.id': string;
  'nebula.run.id': string;
  'nebula.step.id': string;
  'nebula.agent.name': string;
  'nebula.job.id': string;
  'nebula.cache.key': string;
  'nebula.cache.pattern': string;
  // Subsystem
  'nebula.component': LogComponent;
  // Outcome
  'nebula.duration_ms': number;
  'nebula.outcome': 'completed' | 'rate_limited' | 'failed';
  // Trace (stamped by createLogger's mixin inside an active span)
  trace_id: string;
  span_id: string;
  // Adapters: extra arguments a third-party logger passed alongside its message
  args: unknown[];
};

export type LogAttributeKey = keyof LogAttributeValues;

/**
 * What a log call may carry. Every key is optional and may be `undefined`, which
 * Pino drops from the line — so "when it exists" needs no conditional spread.
 */
export type LogAttributes = { [K in LogAttributeKey]?: LogAttributeValues[K] | undefined };

/**
 * `A` restricted to catalogue keys. An object literal already gets excess
 * property checks; this also rejects an unknown key held in a variable.
 */
export type KnownAttributes<A> = A & Record<Exclude<keyof A, LogAttributeKey>, never>;

/** The attribute keys, for code that builds a key rather than writing it inline. */
export const ATTR = {
  SERVICE_NAME: 'service.name',
  SERVICE_VERSION: 'service.version',
  DEPLOYMENT_ENVIRONMENT_NAME: 'deployment.environment.name',
  HTTP_REQUEST_METHOD: 'http.request.method',
  URL_PATH: 'url.path',
  HTTP_ROUTE: 'http.route',
  HTTP_RESPONSE_STATUS_CODE: 'http.response.status_code',
  HTTP_REQUEST_ID: 'http.request.id',
  SERVER_ADDRESS: 'server.address',
  SERVER_PORT: 'server.port',
  ERR: 'err',
  ERROR_TYPE: 'error.type',
  GEN_AI_PROVIDER_NAME: 'gen_ai.provider.name',
  GEN_AI_REQUEST_MODEL: 'gen_ai.request.model',
  GEN_AI_USAGE_INPUT_TOKENS: 'gen_ai.usage.input_tokens',
  GEN_AI_USAGE_OUTPUT_TOKENS: 'gen_ai.usage.output_tokens',
  USER_ID: 'user.id',
  NEBULA_USER_KIND: 'nebula.user.kind',
  NEBULA_SESSION_ID: 'nebula.session.id',
  NEBULA_MESSAGE_ID: 'nebula.message.id',
  NEBULA_REPLY_MESSAGE_ID: 'nebula.reply.message.id',
  NEBULA_RUN_ID: 'nebula.run.id',
  NEBULA_STEP_ID: 'nebula.step.id',
  NEBULA_AGENT_NAME: 'nebula.agent.name',
  NEBULA_JOB_ID: 'nebula.job.id',
  NEBULA_CACHE_KEY: 'nebula.cache.key',
  NEBULA_CACHE_PATTERN: 'nebula.cache.pattern',
  NEBULA_COMPONENT: 'nebula.component',
  NEBULA_DURATION_MS: 'nebula.duration_ms',
  NEBULA_OUTCOME: 'nebula.outcome',
  TRACE_ID: 'trace_id',
  SPAN_ID: 'span_id',
  ARGS: 'args',
} as const satisfies Record<string, LogAttributeKey>;
