import { Router } from 'express';
import { validate } from '@backend/middleware/validate';
import { authRateLimiter } from '@backend/middleware/rateLimiter';
import { authController } from './auth.controller';
import { sessionTokenHeaderSchema } from './auth.validation';

const authRoutes = Router();

authRoutes.post(
  '/session',
  authRateLimiter,
  validate({ headers: sessionTokenHeaderSchema }),
  authController.createSession,
);

export { authRoutes };
