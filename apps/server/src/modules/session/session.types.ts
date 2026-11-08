import type { z } from 'zod';
import type {
  createSessionSchema,
  getSessionSchema,
  renameSessionSchema,
} from '@server/modules/session/session.validation';

export type CreateSessionDTO = z.infer<typeof createSessionSchema>;

export type GetSessionParams = z.infer<typeof getSessionSchema>;

export type RenameSessionDTO = z.infer<typeof renameSessionSchema>;
