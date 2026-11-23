import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OwnKeyStatus } from '@/libs/api/generated/model/ownKeyStatus';
import {
  getListOwnKeysQueryKey,
  listOwnKeys,
  removeOwnKey,
  saveOwnKey,
} from '@/libs/api/generated/own-keys/own-keys';
import type { OwnKeyProvider } from '@/libs/api/generated/model/ownKeyProvider';

const CHECK_INTERVAL_MS = 3_000;

/** The stored Own keys; refetched while one is still being checked by the worker. */
export const useOwnKeys = ({ enabled }: { enabled: boolean }) =>
  useQuery({
    enabled,
    queryKey: getListOwnKeysQueryKey(),
    queryFn: ({ signal }) => listOwnKeys(undefined, signal),
    refetchInterval: ({ state }) =>
      state.data?.keys.some((key) => key.status === OwnKeyStatus.pending)
        ? CHECK_INTERVAL_MS
        : false,
    meta: { inlineError: true },
  });

export const useSaveOwnKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ provider, key }: { provider: OwnKeyProvider; key: string }) =>
      saveOwnKey(provider, { key }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getListOwnKeysQueryKey() }),
    meta: { inlineError: true },
  });
};

export const useRemoveOwnKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (provider: OwnKeyProvider) => removeOwnKey(provider),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getListOwnKeysQueryKey() }),
    meta: { inlineError: true },
  });
};
