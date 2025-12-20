import { z } from 'zod';

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});
