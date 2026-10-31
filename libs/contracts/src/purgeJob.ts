import { z } from 'zod';

/** The BullMQ queue the worker schedules the daily Purge on and consumes (ADR-0031). */
export const PURGE_QUEUE = 'purge';

/** The fixed id of the Purge's job scheduler, so every worker instance upserts the same one. */
export const PURGE_SCHEDULER_ID = 'daily-purge';

/** The Purge reads everything it needs from Postgres, so the payload is empty. */
export const purgeJobSchema = z.object({});

export type PurgeJob = z.infer<typeof purgeJobSchema>;
