import { registry } from '@backend/config/openapi.config';
import { z } from 'zod';

export const errorResponseSchema = registry.register(
  'ErrorResponse',
  z.object({
    success: z.literal(false),
    error: z.string(),
    message: z.string(),
  }),
);
