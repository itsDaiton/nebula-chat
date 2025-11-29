import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const validate =
  (schemas: { body?: z.ZodType; params?: z.ZodType; query?: z.ZodType }) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        const result = schemas.body.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json({
            error: 'Validation error',
            where: 'body',
            details: z.treeifyError(result.error),
          });
        }
        req.body = result.data as any;
      }
      if (schemas.params) {
        const result = schemas.params.safeParse(req.params);
        if (!result.success) {
          return res.status(400).json({
            error: 'Validation error',
            where: 'params',
            details: z.treeifyError(result.error),
          });
        }
        req.params = result.data as any;
      }
      if (schemas.query) {
        const result = schemas.query.safeParse(req.query);
        if (!result.success) {
          return res.status(400).json({
            error: 'Validation error',
            where: 'query',
            details: z.treeifyError(result.error),
          });
        }
        req.query = result.data as any;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
