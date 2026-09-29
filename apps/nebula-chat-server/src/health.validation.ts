import { z } from 'zod';

export const apiRootSchema = z.object({ message: z.string() }).meta({ id: 'ApiRoot' });

export const healthSchema = z
  .object({ status: z.literal('ok'), timestamp: z.string() })
  .meta({ id: 'Health' });
