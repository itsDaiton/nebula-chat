import type { FastifyReply, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { errorCodeForStatus, isAppError, toErrorEnvelope } from '@nebula-chat/errors';
import type { ErrorEnvelope } from '@nebula-chat/errors';

type MappedError = { status: number; envelope: ErrorEnvelope };

// PostgreSQL errors: keep details in logs, return client-safe messages.
const PG_ERROR_MAP: Readonly<Record<string, MappedError>> = {
  '23505': {
    status: 409,
    envelope: {
      success: false,
      error: 'Conflict',
      message: 'A record with the same unique value already exists.',
    },
  },
  '23503': {
    status: 409,
    envelope: {
      success: false,
      error: 'Conflict',
      message: 'A related record could not be found.',
    },
  },
  '23502': {
    status: 400,
    envelope: {
      success: false,
      error: 'Validation',
      message: 'Missing required data for this operation.',
    },
  },
  '23514': {
    status: 400,
    envelope: {
      success: false,
      error: 'Validation',
      message: 'Provided data did not satisfy a required rule.',
    },
  },
};

const isErrorStatus = (value: unknown): value is number =>
  typeof value === 'number' && value >= 400 && value <= 599;

/**
 * Errors that are neither AppErrors nor Postgres errors — typically Fastify's
 * own (rate limit, body too large, bad content type). A 4xx status is a
 * framework message written for the caller, so it is kept; anything else may
 * carry internals and is reported generically.
 */
const mapUnclassified = (err: Error): MappedError => {
  const { statusCode, status: statusValue } = err as { statusCode?: unknown; status?: unknown };
  let status = 500;
  if (isErrorStatus(statusCode)) {
    status = statusCode;
  } else if (isErrorStatus(statusValue)) {
    status = statusValue;
  }

  if (status >= 500) {
    return { status, envelope: toErrorEnvelope(err) };
  }
  return {
    status,
    envelope: { success: false, error: errorCodeForStatus(status), message: err.message },
  };
};

const mapError = (err: Error): MappedError => {
  if (hasZodFastifySchemaValidationErrors(err)) {
    return { status: 400, envelope: { success: false, error: 'Validation', message: err.message } };
  }

  if (isAppError(err)) {
    return { status: err.status, envelope: toErrorEnvelope(err) };
  }

  const { code } = err as { code?: unknown };
  const pgError = typeof code === 'string' ? PG_ERROR_MAP[code] : undefined;
  if (pgError) {
    return pgError;
  }

  return mapUnclassified(err);
};

export const errorHandler = (err: Error, _req: FastifyRequest, reply: FastifyReply): void => {
  reply.log.error(err);

  const { status, envelope } = mapError(err);
  reply.status(status).send(envelope);
};
