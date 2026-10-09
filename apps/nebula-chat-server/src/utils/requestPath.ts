import type { FastifyRequest } from 'fastify';
import { REDACT_CENSOR } from '@nebula-chat/otel';

/** Routes that carry a bearer token as a path segment; capture group 1 is the prefix kept. */
const PATH_TOKEN_PATTERNS: readonly RegExp[] = [/^(\/api\/auth\/reset-password\/)[^/]+$/];

const redactPathTokens = (path: string): string =>
  PATH_TOKEN_PATTERNS.reduce(
    (redacted, pattern) => redacted.replace(pattern, `$1${REDACT_CENSOR}`),
    path,
  );

/**
 * `url.path`: the request path without its query string, with path-borne tokens
 * redacted. The query can carry search terms, cursors and tokens, so it is dropped.
 */
export const requestPath = (req: FastifyRequest): string =>
  redactPathTokens(req.url.split('?', 1)[0] ?? req.url);
