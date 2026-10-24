import { z } from 'zod';
import { paginationConfig } from '@server/config/pagination.config';
import { isoDateTimeSchema } from '@server/utils/isoDateTimeSchema';

export const createSessionSchema = z.object({
  title: z.string().min(1),
});

export const getSessionSchema = z.object({
  sessionId: z.uuid(),
});

export const sessionResponseSchema = z
  .object({
    id: z.uuid(),
    title: z.string(),
    createdAt: isoDateTimeSchema,
  })
  .meta({ id: 'Session' });

export const sessionDetailResponseSchema = sessionResponseSchema
  .extend({
    activeStreamId: z
      .uuid()
      .nullable()
      .describe(
        'The reply still being produced for this Session, to re-attach to with `GET /api/streams/{streamId}`; null when none is in flight',
      ),
  })
  .meta({ id: 'SessionDetail' });

export const sessionsArraySchema = z.array(sessionResponseSchema).max(100);

export const searchSessionsQuerySchema = z.object({
  q: z.string().min(1).describe('Search query to filter sessions by title'),
});

export const getSessionsQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(paginationConfig.maxLimit)
    .optional()
    .default(paginationConfig.defaultLimit)
    .describe(
      `Number of sessions to fetch (1-${String(paginationConfig.maxLimit)}, default ${String(paginationConfig.defaultLimit)})`,
    ),
  cursor: z.uuid().optional().describe('Pagination cursor for fetching the next page of sessions'),
});

export const paginatedSessionsResponseSchema = z
  .object({
    sessions: sessionsArraySchema,
    nextCursor: z.uuid().nullable(),
    hasMore: z.boolean(),
  })
  .meta({ id: 'SessionPage' });
