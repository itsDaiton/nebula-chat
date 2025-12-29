import { Router } from 'express';
import { rateLimiter } from '@backend/middleware/rateLimiter';
import { authController } from './auth.controller';

const authRoutes = Router();

authRoutes.post('/session', rateLimiter, authController.createSession);

export { authRoutes };
