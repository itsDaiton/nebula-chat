import { z } from 'zod';
import { modelProviderSchema } from './models/modelCatalog';

/**
 * Which stored Own key each provider's Model calls use: a row id, never a key (ADR-0013, ADR-0037).
 * A provider with no entry uses the Operator key; the field is optional so a job without it parses as before.
 */
export const ownKeyRefsSchema = z.partialRecord(modelProviderSchema, z.uuid());

export type OwnKeyRefs = z.infer<typeof ownKeyRefsSchema>;
