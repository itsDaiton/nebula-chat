import type { QueryClient } from '@tanstack/react-query';
import {
  getGetMessageAllowanceQueryKey,
  getGetSpendAllowanceQueryKey,
} from '@/libs/api/generated/chat/chat';
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

// The worker records a call's cost as it runs, so the spend shown is stale once a reply ends.
export const invalidateSpendAllowance = (queryClient: QueryClient) =>
  void queryClient.invalidateQueries({ queryKey: getGetSpendAllowanceQueryKey() });

export const invalidateAfterSend = (queryClient: QueryClient, sessionId: string) => {
  invalidateMessageAllowance(queryClient);
  // The send may have answered the Session's waiting Run, which then waits no more.
  void queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) });
};

const RUN_REFRESH_MS = 500;

type RunThrottle = { timer: ReturnType<typeof setTimeout>; queued: boolean };

// Module-level, not React state: a burst of finished Steps spans renders and components.
const throttles = new Map<string, RunThrottle>();

// A Run's end changes the Run the thread card and the Inspector show; it also drops a throttled refresh still waiting.
export const invalidateRun = (queryClient: QueryClient, runId: string) => {
  const open = throttles.get(runId);
  if (open) clearTimeout(open.timer);
  throttles.delete(runId);
  void queryClient.invalidateQueries({ queryKey: getGetRunQueryKey(runId) });
};

// A finished Step refetches the Run at once, then at most once per window, however many finish inside it.
export const invalidateRunThrottled = (queryClient: QueryClient, runId: string) => {
  const open = throttles.get(runId);
  if (open) {
    open.queued = true;
    return;
  }
  void queryClient.invalidateQueries({ queryKey: getGetRunQueryKey(runId) });
  const next: RunThrottle = {
    queued: false,
    timer: setTimeout(() => {
      throttles.delete(runId);
      if (next.queued) invalidateRunThrottled(queryClient, runId);
    }, RUN_REFRESH_MS),
  };
  throttles.set(runId, next);
};

export const invalidateCompletedStream = (queryClient: QueryClient, sessionId: string) => {
  invalidateSpendAllowance(queryClient);
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
