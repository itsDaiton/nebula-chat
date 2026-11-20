import type { ModelProvider } from '@nebula-chat/contracts';
import { MissingConfigurationError } from '@nebula-chat/errors';

/** Where a Model call gets its provider key; the Operator key is the only source until an Own key joins it. */
export type KeyResolver = {
  /** The key for `provider`; throws `MissingConfigurationError` when none is configured. */
  keyFor: (provider: ModelProvider) => string;
  /** Every key value this resolver may hand out, so error text can be scrubbed of them. */
  knownKeys: () => string[];
};

export type OperatorKeys = { [P in ModelProvider]?: string | undefined };

const ENV_NAMES: Record<ModelProvider, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
};

export const operatorKeyResolver = (keys: OperatorKeys): KeyResolver => ({
  keyFor: (provider) => {
    const key = keys[provider];
    if (!key) throw new MissingConfigurationError(ENV_NAMES[provider]);
    return key;
  },
  knownKeys: () => Object.values(keys).filter((key): key is string => Boolean(key)),
});
