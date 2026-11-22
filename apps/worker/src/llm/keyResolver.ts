import type { ModelProvider, OwnKeyRefs } from '@nebula-chat/contracts';
import {
  InvalidOwnKeyError,
  MissingConfigurationError,
  TooManyRequestsError,
} from '@nebula-chat/errors';
import type { OwnKeyCrypto } from '@worker/ownKeys/ownKeyCrypto';
import type { OwnKeyStore, StoredOwnKey } from '@worker/ownKeys/ownKeyStore';

/** Where one job's Model calls get their provider keys: a stored Own key where the job names one, else the Operator key. */
export type KeyResolver = {
  /** The key for `provider`, loaded afresh on every call; throws a typed error when an Own key cannot serve it, never falling back. */
  keyFor: (provider: ModelProvider) => Promise<string>;
  /** Whether this job's calls to `provider` run on an Own key. */
  isOwn: (provider: ModelProvider) => boolean;
  /** Runs a Model call to `provider`; a failure of an Own key is turned into the User's to fix or retry, and an authentication one marks the key invalid. */
  guard: <T>(provider: ModelProvider, call: () => Promise<T>) => Promise<T>;
  /** Every key value this resolver has handed out or may, so error text can be scrubbed of them. */
  knownKeys: () => string[];
};

/** Builds the resolver of one job from its owner and the key references its payload carries. */
export type KeyResolverFactory = (job: {
  userId: string;
  keyRefs?: OwnKeyRefs | undefined;
}) => KeyResolver;

export type OperatorKeys = { [P in ModelProvider]?: string | undefined };

const ENV_NAMES: Record<ModelProvider, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
};

const statusOf = (error: unknown): number | undefined => {
  for (let e = error, depth = 0; e instanceof Error && depth < 5; e = e.cause, depth++) {
    const status = (e as { status?: unknown }).status;
    if (typeof status === 'number') return status;
  }
  return undefined;
};

export const createKeyResolver =
  (
    operator: OperatorKeys,
    // Without it a job naming an Own key fails, as it does for a key that is gone.
    own?: { store: OwnKeyStore; crypto: OwnKeyCrypto },
  ): KeyResolverFactory =>
  ({ userId, keyRefs }) => {
    // The plaintext Own keys this job has loaded, for scrubbing and for finding the row to mark invalid.
    const loaded = new Map<ModelProvider, { plaintext: string; row: StoredOwnKey }>();
    const operatorKey = (provider: ModelProvider): string => {
      const key = operator[provider];
      if (!key) throw new MissingConfigurationError(ENV_NAMES[provider]);
      return key;
    };
    const ownKey = async (provider: ModelProvider, ref: string): Promise<string> => {
      const row = await own?.store.find(ref);
      // A reference to another User's key, or another provider's, is as good as none.
      if (
        !own ||
        !row ||
        row.userId !== userId ||
        row.provider !== provider ||
        row.status !== 'valid'
      ) {
        throw new InvalidOwnKeyError(provider);
      }
      let plaintext: string;
      try {
        plaintext = own.crypto.decrypt(row.ciphertext, row.keyVersion);
      } catch (cause) {
        throw new InvalidOwnKeyError(provider, { cause });
      }
      loaded.set(provider, { plaintext, row });
      return plaintext;
    };
    return {
      keyFor: async (provider) => {
        const ref = keyRefs?.[provider];
        return ref ? ownKey(provider, ref) : operatorKey(provider);
      },
      isOwn: (provider) => Boolean(keyRefs?.[provider]),
      guard: async (provider, call) => {
        try {
          return await call();
        } catch (error) {
          const used = loaded.get(provider);
          if (!used || !own) throw error;
          const status = statusOf(error);
          if (status === 401) {
            await own.store.setStatus(used.row, 'invalid');
            throw new InvalidOwnKeyError(provider, { cause: error });
          }
          if (status === 429) {
            throw new TooManyRequestsError(
              `Your ${provider} account is out of quota or rate limited. Try again later.`,
              { cause: error },
            );
          }
          throw error;
        }
      },
      knownKeys: () => [
        ...Object.values(operator).filter((key): key is string => Boolean(key)),
        ...[...loaded.values()].map(({ plaintext }) => plaintext),
      ],
    };
  };

/** A resolver with no Own key store: every job runs on the Operator key. */
export const operatorKeyResolver = (keys: OperatorKeys): KeyResolverFactory =>
  createKeyResolver(keys);
