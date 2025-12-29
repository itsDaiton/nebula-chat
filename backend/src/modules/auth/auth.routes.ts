import { Router } from 'express';
import { authRateLimiter } from '@backend/middleware/rateLimiter';
import { authController } from './auth.controller';

const authRoutes = Router();

authRoutes.post('/session', authRateLimiter, authController.createSession);

export { authRoutes };
