import type { OwnKeyProvider, OwnKeyStatus } from '@nebula-chat/db';

export type StoredOwnKey = {
  id: string;
  userId: string;
  provider: OwnKeyProvider;
  ciphertext: string;
  keyVersion: number;
  status: OwnKeyStatus;
};

/** Where stored Own keys are read and updated: Postgres in production. */
export type OwnKeyStore = {
  find: (id: string) => Promise<StoredOwnKey | null>;
  /** Applies only while the key is still as read: a failure of a replaced key must not mark its successor. */
  setStatus: (key: StoredOwnKey, status: OwnKeyStatus) => Promise<void>;
  /** Keys written under any version but `version`. */
  findNotAtVersion: (version: number) => Promise<StoredOwnKey[]>;
  /** One update that applies only while the key is still as read, so a key replaced meanwhile is left alone; false when it was. */
  replaceCiphertext: (
    key: StoredOwnKey,
    next: { ciphertext: string; keyVersion: number },
  ) => Promise<boolean>;
};
