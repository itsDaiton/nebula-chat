import type { FastifyRequest } from 'fastify';
import type { ErrorCode } from '@nebula-chat/errors';

/**
 * Each failed request's error classification, keyed by request: the error handler records it and `http.request.completed` reads it.
 * A module-level map avoids the `interface` that Fastify type augmentation would need.
 */
const errorTypes = new WeakMap<FastifyRequest, ErrorCode>();

export const recordErrorType = (req: FastifyRequest, errorType: ErrorCode): void => {
  errorTypes.set(req, errorType);
};

export const recordedErrorType = (req: FastifyRequest): ErrorCode | undefined =>
  errorTypes.get(req);
