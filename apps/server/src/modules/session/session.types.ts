import type { z } from 'zod';
import type { createSessionSchema, getSessionSchema } from './session.validation';

export type CreateSessionDTO = z.infer<typeof createSessionSchema>;

export type GetSessionParams = z.infer<typeof getSessionSchema>;
