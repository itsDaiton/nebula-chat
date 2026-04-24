import type { FastifyReply, FastifyRequest, preValidationHookHandler } from 'fastify';
import { z } from 'zod';

type ValidationSchemas = {
  body?: z.ZodType;
  params?: z.ZodType;
  query?: z.ZodType;
};

export const validate =
  (schemas: ValidationSchemas): preValidationHookHandler =>
  async (req: FastifyRequest, reply: FastifyReply) => {
    const errors: Record<string, unknown> = {};

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (result.success) {
        req.body = result.data;
      } else {
        errors.body = z.treeifyError(result.error);
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (result.success) {
        req.params = result.data;
      } else {
        errors.params = z.treeifyError(result.error);
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (result.success) {
        req.query = result.data;
      } else {
        errors.query = z.treeifyError(result.error);
      }
    }

    if (Object.keys(errors).length > 0) {
      await reply.status(400).send({
        success: false,
        error: 'ValidationError',
        details: errors,
      });
    }
  };
