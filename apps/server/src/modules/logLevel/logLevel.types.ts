import type { z } from 'zod';
import type { changeLogLevelSchema } from '@backend/modules/logLevel/logLevel.validation';

export type ChangeLogLevelDTO = z.infer<typeof changeLogLevelSchema>;
