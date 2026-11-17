import type { QueryClient } from '@tanstack/react-query';
import { getGetMessageAllowanceQueryKey } from '@/libs/api/generated/chat/chat';
import { getListMessagesQueryKey } from '@/libs/api/generated/messages/messages';
import type { Run } from '@/libs/api/generated/model/run';
import { getGetRunQueryKey } from '@/libs/api/generated/runs/runs';
import {
  getGetSessionQueryKey,
  getListSessionsInfiniteQueryKey,
} from '@/libs/api/generated/sessions/sessions';

// SSE isn't a query, so the cache is invalidated rather than seeded (ADR-0012).
export const invalidateSessionList = (queryClient: QueryClient) =>
  void queryClient.invalidateQueries({ queryKey: getListSessionsInfiniteQueryKey() });

// The server counts a message against the allowance once it persists it, so the counter refetches then.
export const invalidateMessageAllowance = (queryClient: QueryClient) =>
  void queryClient.invalidateQueries({ queryKey: getGetMessageAllowanceQueryKey() });

export const invalidateAfterSend = (queryClient: QueryClient, sessionId: string) => {
  invalidateMessageAllowance(queryClient);
  // The send may have answered the Session's waiting Run, which then waits no more.
  void queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) });
};

// A Run's Step or end changes the Run the Inspector may be showing.
export const invalidateRun = (queryClient: QueryClient, runId: string) =>
  void queryClient.invalidateQueries({ queryKey: getGetRunQueryKey(runId) });

export const invalidateCompletedStream = (queryClient: QueryClient, sessionId: string) => {
  invalidateSessionList(queryClient);
  void queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey() });
  void queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) });
  // A Run cached before it ended (one waiting on a Clarifying question) has moved on; ended Runs never change.
  void queryClient.invalidateQueries({
    predicate: ({ queryKey, state }) =>
      String(queryKey[0]).startsWith(getGetRunQueryKey('')[0]) &&
      !(state.data as Run | undefined)?.finishedAt,
  });
};
