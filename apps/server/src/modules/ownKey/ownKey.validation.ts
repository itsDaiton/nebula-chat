import { z } from 'zod';
import { modelProviderSchema } from '@nebula-chat/contracts';
import { OWN_KEY_STATUSES } from '@nebula-chat/db';

// RSA-OAEP with SHA-256 under a 4096-bit key carries at most 446 bytes, so a key must stay well below that.
const MAX_KEY_LENGTH = 300;

export const ownKeyParamsSchema = z.object({ provider: modelProviderSchema });

export const ownKeyBodySchema = z.object({
  key: z.string().trim().min(8).max(MAX_KEY_LENGTH).describe('The provider API key; write-only'),
});

export const ownKeySchema = z
  .object({
    provider: modelProviderSchema,
    lastFour: z.string().describe('The last four characters of the key'),
    status: z
      .enum(OWN_KEY_STATUSES)
      .describe('`pending` until the worker validates it; only a `valid` key is used'),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: 'OwnKey' });

export const ownKeyListSchema = z
  .object({
    enabled: z.boolean().describe('Whether this server can store Own keys'),
    keys: z.array(ownKeySchema),
  })
  .meta({ id: 'OwnKeyList' });
