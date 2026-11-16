import type { z } from 'zod';
import type {
  changeLogLevelSchema,
  logLevelServiceQuerySchema,
} from '@server/modules/logLevel/logLevel.validation';

export type ChangeLogLevelDTO = z.infer<typeof changeLogLevelSchema>;

export type LogLevelServiceQuery = z.infer<typeof logLevelServiceQuerySchema>;
