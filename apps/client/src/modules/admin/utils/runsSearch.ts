import { z } from 'zod';
import { ListAllRunsOrder } from '@/libs/api/generated/model/listAllRunsOrder';
import { ListAllRunsSortBy } from '@/libs/api/generated/model/listAllRunsSortBy';
import { ListAllRunsStatusItem } from '@/libs/api/generated/model/listAllRunsStatusItem';

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .catch(undefined);

export const runsSearchSchema = z.object({
  status: z.array(z.enum(ListAllRunsStatusItem)).optional().catch(undefined),
  user: z.uuid().optional().catch(undefined),
  from: day,
  to: day,
  sort: z.enum(ListAllRunsSortBy).optional().catch(undefined),
  dir: z.enum(ListAllRunsOrder).optional().catch(undefined),
  cursor: z.uuid().optional().catch(undefined),
  selected: z.uuid().optional().catch(undefined),
});
