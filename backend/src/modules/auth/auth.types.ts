import type { z } from 'zod';
import type { sessionTokenSchema } from './auth.validation';

export interface AuthTokenPayload {
  type: 'nebula-session';
  iat: number;
  exp?: number;
}

export interface SessionTokenResponse {
  accessToken: string;
  expiresIn: string;
  tokenType: string;
}

export type SessionTokenRequest = z.infer<typeof sessionTokenSchema>;
