import jwt from 'jsonwebtoken';
import { authConfig } from '@backend/config/auth.config';
import type { AuthTokenPayload } from './auth.types';

const API_SECRET = process.env.API_SECRET;

if (!API_SECRET) {
  throw new Error('API_SECRET environment variable is required');
}

export const authService = {
  signToken(): string {
    const payload: AuthTokenPayload = {
      type: 'nebula-session',
    };

    return jwt.sign(payload, API_SECRET, {
      expiresIn: authConfig.tokenExpirySeconds,
      algorithm: authConfig.algorithm as jwt.Algorithm,
    });
  },
  verifyToken(token: string): AuthTokenPayload {
    try {
      const decoded = jwt.verify(token, API_SECRET, {
        algorithms: [authConfig.algorithm as jwt.Algorithm],
      }) as AuthTokenPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  },
};
