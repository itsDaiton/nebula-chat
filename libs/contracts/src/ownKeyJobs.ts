import { z } from 'zod';

/** The BullMQ queue that checks a stored Own key against its provider; the server enqueues, the worker consumes (ADR-0037). */
export const OWN_KEY_VALIDATION_QUEUE = 'own-key-validation';

export const ownKeyValidationJobSchema = z.object({ ownKeyId: z.uuid() });

export type OwnKeyValidationJob = z.infer<typeof ownKeyValidationJobSchema>;

/** The BullMQ queue that re-encrypts stored Own keys to the current key version after a rotation. */
export const OWN_KEY_REWRAP_QUEUE = 'own-key-rewrap';

/** The re-wrap reads every stale key from Postgres, so the payload is empty. */
export const ownKeyRewrapJobSchema = z.object({});

export type OwnKeyRewrapJob = z.infer<typeof ownKeyRewrapJobSchema>;
