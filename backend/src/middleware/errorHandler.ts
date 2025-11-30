import type { NextFunction, Request, Response } from 'express';
import { Prisma } from 'prisma/generated/prisma/client';
import { AppError } from '@backend/errors/AppError';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  // eslint-disable-next-line no-console
  console.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      error: err.error,
      message: err.message,
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return res.status(400).json({
      success: false,
      error: 'PrismaClientKnownRequestError',
      message: err.message,
      code: err.code,
    });
  }

  if (err.status) {
    return res.status(err.status).json({
      success: false,
      error: err.error || 'Error',
      message: err.message || 'An error occurred',
      details: err.details || undefined,
    });
  }

  return res.status(500).json({
    success: false,
    error: 'InternalServerError',
    message: err.message || 'An internal server error occurred',
  });
};
