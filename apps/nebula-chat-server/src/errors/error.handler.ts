import type { FastifyReply, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { AppError } from '@backend/errors/AppError';
import { Prisma } from '@backend/prisma';

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

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    reply.status(400).send({
      success: false,
      error: 'PrismaClientKnownRequestError',
      message: err.message,
    });
    return;
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
