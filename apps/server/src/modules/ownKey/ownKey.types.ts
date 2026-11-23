import type { z } from 'zod';
import type {
  ownKeyBodySchema,
  ownKeyListSchema,
  ownKeyParamsSchema,
  ownKeySchema,
} from './ownKey.validation';

export type OwnKeyParams = z.infer<typeof ownKeyParamsSchema>;

export type OwnKeyBody = z.infer<typeof ownKeyBodySchema>;

/** What a User may read of a stored key: never the key or its ciphertext. */
export type OwnKeyDTO = z.infer<typeof ownKeySchema>;

export type OwnKeyListDTO = z.infer<typeof ownKeyListSchema>;
