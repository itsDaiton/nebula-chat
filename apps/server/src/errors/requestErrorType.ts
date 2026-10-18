import type { FastifyRequest } from 'fastify';
import type { ErrorCode } from '@nebula-chat/errors';

/**
 * The error classification each failed request ended with, keyed by request so
 * an entry disappears with it. The error handler records it; the
 * `http.request.completed` line reads it — which is how a 4xx, which writes no
 * line of its own, still says what went wrong. A module-level map rather than
 * a request property: no Fastify type augmentation (the repo forbids the
 * `interface` it needs) and no untyped property on the request.
 */
const errorTypes = new WeakMap<FastifyRequest, ErrorCode>();

export const recordErrorType = (req: FastifyRequest, errorType: ErrorCode): void => {
  errorTypes.set(req, errorType);
};

export const recordedErrorType = (req: FastifyRequest): ErrorCode | undefined =>
  errorTypes.get(req);
