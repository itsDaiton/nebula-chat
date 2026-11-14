import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { savePrivateJson } from '@cli/config/config';
import { CliError } from '@cli/errors';

/** The OS keychain, one secret per account. Every call rejects on a machine without one. */
export type Keychain = {
  get: (account: string) => Promise<string | null>;
  set: (account: string, secret: string) => Promise<void>;
  delete: (account: string) => Promise<void>;
};

export type CredentialStorage = 'keychain' | 'file';

const fileSchema = z.record(z.string(), z.string());

const readFileTokens = async (path: string): Promise<Record<string, string>> => {
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw err;
  }
  try {
    return fileSchema.parse(JSON.parse(raw));
  } catch {
    throw new CliError(`${path} is not a valid credentials file. Delete it and log in again.`);
  }
};

/**
 * Where `nebula login` keeps auth session tokens: the OS keychain, else `credentials.json` (0600)
 * beside the config file. Keyed by server URL, so a token is only ever sent to the server that issued it.
 */
export const createCredentialStore = (keychain: Keychain, configFile: string) => {
  const file = join(dirname(configFile), 'credentials.json');

  const removeFromFile = async (serverUrl: string) => {
    const { [serverUrl]: removed, ...rest } = await readFileTokens(file);
    if (removed !== undefined) await savePrivateJson(file, rest);
  };

  return {
    load: async (serverUrl: string): Promise<string | undefined> => {
      const fromKeychain = await keychain.get(serverUrl).catch(() => null);
      return fromKeychain ?? (await readFileTokens(file))[serverUrl];
    },

    save: async (serverUrl: string, token: string): Promise<CredentialStorage> => {
      try {
        await keychain.set(serverUrl, token);
      } catch {
        await savePrivateJson(file, { ...(await readFileTokens(file)), [serverUrl]: token });
        return 'file';
      }
      // An older token in the file would outlive this one's logout.
      await removeFromFile(serverUrl);
      return 'keychain';
    },

    remove: async (serverUrl: string) => {
      await keychain.delete(serverUrl).catch(() => undefined);
      await removeFromFile(serverUrl);
    },
  };
};
