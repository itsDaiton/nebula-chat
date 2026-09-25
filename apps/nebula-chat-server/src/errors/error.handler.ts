import type { FastifyReply, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import {
  AppError,
  ConflictError,
  errorCodeForStatus,
  isAppError,
  ValidationError,
} from '@nebula-chat/errors';
import { componentLogger, logEvent } from '@nebula-chat/otel';
import { recordErrorType } from '@backend/errors/requestErrorType';
import { requestPath } from '@backend/utils/requestPath';

// PostgreSQL constraint violations: the client gets a safe message, and the
// driver error rides along as the AppError's cause. A mapped violation is a 4xx,
// which writes no line, so the cause shows only where that AppError is logged.
const PG_ERRORS: Readonly<Record<string, (cause: Error) => AppError>> = {
  '23505': (cause) =>
    new ConflictError('A record with the same unique value already exists.', { cause }),
  '23503': (cause) => new ConflictError('A related record could not be found.', { cause }),
  '23502': (cause) => new ValidationError('Missing required data for this operation.', { cause }),
  '23514': (cause) =>
    new ValidationError('Provided data did not satisfy a required rule.', { cause }),
};

const isErrorStatus = (value: unknown): value is number =>
  typeof value === 'number' && value >= 400 && value <= 599;

/** The error status a thrown value carries itself, as Fastify's own errors do. */
const ownStatus = (err: Error): number | undefined => {
  const { statusCode, status } = err as { statusCode?: unknown; status?: unknown };
  return [statusCode, status].find(isErrorStatus);
};

const toAppError = (err: Error): AppError => {
  if (isAppError(err)) {
    return err;
  }
  if (hasZodFastifySchemaValidationErrors(err)) {
    return new ValidationError(err.message, { cause: err });
  }
  const { code } = err as { code?: unknown };
  const pgError = typeof code === 'string' ? PG_ERRORS[code] : undefined;
  if (pgError) {
    return pgError(err);
  }
  // A framework error is classified by its status. A 4xx message is written
  // for the caller; anything else lands on Internal, whose message is withheld.
  return new AppError(errorCodeForStatus(ownStatus(err) ?? 500), err.message, { cause: err });
};

/**
 * Classifies, then logs once — here, where the error is handled:
 *
 * - A 5xx writes one `error` line (`http.request.failed`) with the thrown error
 *   as `err` (its stack and cause) and its code as `error.type`.
 * - A 4xx writes nothing: the caller was told, and it is not a fault a human
 *   should look at.
 *
 * Either way the code is recorded, so the request's `http.request.completed`
 * line names it.
 */
export const errorHandler = (err: Error, req: FastifyRequest, reply: FastifyReply): void => {
  const appError = toAppError(err);
  // A framework error's own status (415, 503, …) is more precise than its code's.
  const status = ownStatus(err) ?? appError.status;
  recordErrorType(req, appError.code);

  if (status >= 500) {
    logEvent(
      componentLogger(reply.log, 'http'),
      'error',
      'http.request.failed',
      {
        err,
        'error.type': appError.code,
        'http.request.method': req.method,
        'url.path': requestPath(req),
        'http.response.status_code': status,
      },
      `${req.method} ${requestPath(req)} failed · ${appError.code}`,
    );
  }

  reply.status(status).send(appError.toEnvelope());
};
