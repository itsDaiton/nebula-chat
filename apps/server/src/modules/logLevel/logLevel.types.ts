import type { z } from 'zod';
import type { changeLogLevelSchema } from '@server/modules/logLevel/logLevel.validation';

export type ChangeLogLevelDTO = z.infer<typeof changeLogLevelSchema>;
