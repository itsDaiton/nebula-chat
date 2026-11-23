import { z } from 'zod';
import { resources } from '@/resources';

export const profileNameSchema = z.object({
  name: z.string().trim().min(1, resources.auth.validation.nameRequired),
});

// Providers differ in format, so only the length floor the server enforces is checked here.
export const ownKeySchema = z.object({
  key: z.string().trim().min(8, resources.settings.ownKeys.errors.tooShort),
});
