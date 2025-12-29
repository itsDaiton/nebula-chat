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
    if (parts.length !== 2 || parts[0] !== authConfig.tokenType) {
      throw new UnauthorizedError(
        `Invalid Authorization header format. Expected: ${authConfig.tokenType} <token>`,
      );
    }

    const token = parts[1];
    if (!token) {
      throw new UnauthorizedError('Missing token');
    }

    try {
      const payload = authService.verifyToken(token);
      req.authPayload = payload;
      next();
    } catch {
      throw new UnauthorizedError('Token verification failed');
    }
  } catch (error) {
    next(error);
  }
};
