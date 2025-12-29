import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '@backend/errors/AppError';
import type { SessionTokenResponse } from './auth.types';
import { authService } from './auth.service';
import { authConfig } from '@backend/config/auth.config';

const BOOTSTRAP_SECRET = process.env.BOOTSTRAP_SECRET;

if (!BOOTSTRAP_SECRET) {
  throw new Error('BOOTSTRAP_SECRET environment variable is required');
}

export const authController = {
  async createSession(req: Request, res: Response, next: NextFunction) {
    try {
      const bootstrapSecret = req.headers['x-nebula-bootstrap'] as string;

      if (!bootstrapSecret) {
        throw new UnauthorizedError('Missing bootstrap secret');
      }

      if (bootstrapSecret !== BOOTSTRAP_SECRET) {
        throw new UnauthorizedError('Invalid bootstrap secret');
      }

      const accessToken = authService.signToken();

      const response: SessionTokenResponse = {
        accessToken,
        expiresIn: authConfig.tokenExpirySeconds.toString(),
        tokenType: authConfig.tokenType,
      };

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  },
};
