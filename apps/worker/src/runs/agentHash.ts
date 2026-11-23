import { createHash } from 'node:crypto';

// Imports nothing but node:crypto: the root stamp script loads it without the workspace installed.
// Sorted keys, so neither the file's formatting nor its key order moves the hash.
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([key, inner]) => [key, canonical(inner)]),
    );
  return value;
};

/** sha256 over an Agent file's definition fields and its prompt's text; `version` and `hash` do not count. */
export const agentHash = (file: Record<string, unknown>, promptText: string): string => {
  const definition = Object.fromEntries(
    Object.entries(file).filter(([key]) => key !== 'version' && key !== 'hash'),
  );
  return createHash('sha256')
    .update(JSON.stringify(canonical({ ...definition, promptText })))
    .digest('hex');
};
