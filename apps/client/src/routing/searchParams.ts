import { z } from 'zod';

/**
 * An optional text search param. TanStack Router JSON-parses each value, so a scalar (`?token=123`
 * arrives as a number) is turned back into text; a structured value (a repeated key's array, a
 * `{…}` object) is malformed and falls back to absent, as does anything else.
 */
export const optionalSearchText = () =>
  z.union([z.string(), z.number(), z.boolean()]).transform(String).optional().catch(undefined);
