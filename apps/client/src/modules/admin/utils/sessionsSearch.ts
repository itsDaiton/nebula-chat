import { z } from 'zod';
import { ListAllSessionsArchived } from '@/libs/api/generated/model/listAllSessionsArchived';
import { ListAllSessionsOrder } from '@/libs/api/generated/model/listAllSessionsOrder';
import { optionalSearchText } from '@/routing/searchParams';

// Shared by the table and the transcript, so a transcript's URL carries the table state back.
export const sessionsSearchSchema = z.object({
  q: optionalSearchText(),
  user: z.uuid().optional().catch(undefined),
  model: optionalSearchText(),
  // `?archived=true` arrives JSON-parsed as a boolean, so it is turned back into the API's text.
  archived: z
    .preprocess(
      (value) => (typeof value === 'boolean' ? String(value) : value),
      z.enum(ListAllSessionsArchived),
    )
    .optional()
    .catch(undefined),
  dir: z.enum(ListAllSessionsOrder).optional().catch(undefined),
  cursor: z.uuid().optional().catch(undefined),
});
