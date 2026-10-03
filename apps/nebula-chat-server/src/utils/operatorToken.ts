import { z } from 'zod';

/**
 * `OPERATOR_TOKEN`: 32+ characters, or unset to switch `/api/internal/*` off.
 * An empty value counts as unset, since `.env.example` ships `OPERATOR_TOKEN=`.
 */
export const operatorTokenSchema = z.preprocess(
  (raw) => (raw === '' ? undefined : raw),
  z.string().min(32).optional(),
);
