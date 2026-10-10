import { z } from 'zod';
import { resources } from '@/resources';

export const profileNameSchema = z.object({
  name: z.string().trim().min(1, resources.auth.validation.nameRequired),
});
