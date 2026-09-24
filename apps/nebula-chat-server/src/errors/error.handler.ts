import type { FastifyReply, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import {
  AppError,
  ConflictError,
  errorCodeForStatus,
  isAppError,
  ValidationError,
} from '@nebula-chat/errors';

// PostgreSQL constraint violations: the driver's detail stays in the logs, the
// client gets a safe message.
const PG_ERRORS: Readonly<Record<string, () => AppError>> = {
  '23505': () => new ConflictError('A record with the same unique value already exists.'),
  '23503': () => new ConflictError('A related record could not be found.'),
  '23502': () => new ValidationError('Missing required data for this operation.'),
  '23514': () => new ValidationError('Provided data did not satisfy a required rule.'),
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
    return new ValidationError(err.message);
  }
  const { code } = err as { code?: unknown };
  const pgError = typeof code === 'string' ? PG_ERRORS[code] : undefined;
  if (pgError) {
    return pgError();
  }
  // A framework error is classified by its status. A 4xx message is written
  // for the caller; anything else lands on Internal, whose message is withheld.
  return new AppError({ error: errorCodeForStatus(ownStatus(err) ?? 500), message: err.message });
};

export const errorHandler = (err: Error, _req: FastifyRequest, reply: FastifyReply): void => {
  reply.log.error(err);

  const appError = toAppError(err);
  // A framework error's own status (415, 503, …) is more precise than its code's.
  reply.status(ownStatus(err) ?? appError.status).send(appError.toEnvelope());
};
