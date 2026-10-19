import { z } from 'zod';
import { paginationConfig } from '@backend/config/pagination.config';
import { isoDateTimeSchema } from '@backend/utils/isoDateTimeSchema';

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
