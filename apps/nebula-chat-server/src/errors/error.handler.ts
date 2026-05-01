import type { FastifyReply, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { AppError } from '@backend/errors/AppError';

export const errorHandler = (err: Error, _req: FastifyRequest, reply: FastifyReply): void => {
  reply.log.error(err);

  if (hasZodFastifySchemaValidationErrors(err)) {
    reply.status(400).send({ success: false, error: 'ValidationError', message: err.message });
    return;
  }

  if (err instanceof AppError) {
    reply.status(err.status).send({ success: false, error: err.error, message: err.message });
    return;
  }

  // PostgreSQL errors: keep details in logs, return client-safe messages.
  const pgErr = err as { code?: string; constraint?: string };
  if (pgErr.code) {
    const pgErrorMap: Record<string, { status: number; error: string; message: string }> = {
      '23505': {
        status: 409,
        error: 'ConflictError',
        message: 'A record with the same unique value already exists.',
      },
      '23503': {
        status: 409,
        error: 'ConflictError',
        message: 'A related record could not be found.',
      },
      '23502': {
        status: 400,
        error: 'ValidationError',
        message: 'Missing required data for this operation.',
      },
      '23514': {
        status: 400,
        error: 'ValidationError',
        message: 'Provided data did not satisfy a required rule.',
      },
    };

    const pgError = pgErrorMap[pgErr.code];
    if (pgError) {
      reply
        .status(pgError.status)
        .send({ success: false, error: pgError.error, message: pgError.message });
      return;
    }
  }

  const errAsUnknown = err as unknown as Record<string, unknown>;

  const statusCode = errAsUnknown['statusCode'];
  const statusValue = errAsUnknown['status'];

  let status = 500;
  if (typeof statusCode === 'number') {
    status = statusCode;
  } else if (typeof statusValue === 'number') {
    status = statusValue;
  }

  const error =
    (typeof errAsUnknown['error'] === 'string' ? errAsUnknown['error'] : undefined) ??
    err.name ??
    'InternalServerError';

  const message =
    typeof errAsUnknown['message'] === 'string'
      ? errAsUnknown['message']
      : 'An internal server error occurred';

  reply.status(status).send({ success: false, error, message });
};
