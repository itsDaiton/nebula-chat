import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '@backend/errors/AppError';
import { authService } from '@backend/modules/auth/auth.service';
import { authConfig } from '@backend/config/auth.config';
import type { AuthTokenPayload } from '@backend/modules/auth/auth.types';

declare global {
  namespace Express {
    interface Request {
      authPayload?: AuthTokenPayload;
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith(`${authConfig.tokenType} `)) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2) {
      throw new UnauthorizedError(
        `Invalid Authorization header format. Expected: ${authConfig.tokenType} <token>`,
      );
    }

    const token = parts[1];
    if (!token || token.trim().length === 0) {
      throw new UnauthorizedError('Missing token');
    }

    try {
      const payload = authService.verifyToken(token);
      req.authPayload = payload;
      next();
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : 'Token verification failed';
      throw new UnauthorizedError(message);
    }
  } catch (error) {
    next(error);
  }
};
