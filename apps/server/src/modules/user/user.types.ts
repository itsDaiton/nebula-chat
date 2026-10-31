import type { z } from 'zod';
import type { userIdParamsSchema } from '@server/modules/user/user.validation';

export type UserIdParams = z.infer<typeof userIdParamsSchema>;
