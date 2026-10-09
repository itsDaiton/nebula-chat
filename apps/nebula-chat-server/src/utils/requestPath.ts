import type { FastifyRequest } from 'fastify';
import { REDACT_CENSOR } from '@nebula-chat/otel';

/** Routes that carry a bearer token in their path: everything after the prefix is redacted. */
const PATH_TOKEN_PREFIXES: readonly string[] = ['/api/auth/reset-password/'];

const redactPathTokens = (path: string): string => {
  const prefix = PATH_TOKEN_PREFIXES.find((p) => path.startsWith(p) && path.length > p.length);
  return prefix ? `${prefix}${REDACT_CENSOR}` : path;
};

/**
 * `url.path`: the request path without its query string, with path-borne tokens
 * redacted. The query can carry search terms, cursors and tokens, so it is dropped.
 */
export const requestPath = (req: FastifyRequest): string =>
  redactPathTokens(req.url.split('?', 1)[0] ?? req.url);
