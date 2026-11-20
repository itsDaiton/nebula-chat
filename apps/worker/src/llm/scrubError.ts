import { scrubSecrets } from '@nebula-chat/otel';
import type { KeyResolver } from '@worker/llm/keyResolver';

/** Scrubs a provider error's text in place, `cause` chain included, so identity checks on it still hold. */
export const scrubError = (error: unknown, keys: KeyResolver): void => {
  const known = keys.knownKeys();
  const seen = new Set<unknown>();
  for (let e = error; e instanceof Error && !seen.has(e); e = e.cause) {
    seen.add(e);
    e.message = scrubSecrets(e.message, known);
    if (e.stack) e.stack = scrubSecrets(e.stack, known);
  }
};
