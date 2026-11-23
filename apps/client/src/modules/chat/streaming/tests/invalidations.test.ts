import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { getGetMessageAllowanceQueryKey } from '@/libs/api/generated/chat/chat';
import { getListMessagesQueryKey } from '@/libs/api/generated/messages/messages';
import { getGetRunQueryKey } from '@/libs/api/generated/runs/runs';
import {
  getGetSessionQueryKey,
  getListSessionsInfiniteQueryKey,
} from '@/libs/api/generated/sessions/sessions';
import {
  invalidateAfterSend,
  invalidateCompletedStream,
  invalidateMessageAllowance,
  invalidateRun,
  invalidateRunThrottled,
  invalidateSessionList,
} from '@/modules/chat/streaming/invalidations';
import { createTestQueryClient } from '@/test/render';

const SESSION_ID = 's1';
const OTHER_SESSION_ID = 's2';

const keys = {
  sessions: getListSessionsInfiniteQueryKey(),
  allowance: getGetMessageAllowanceQueryKey(),
  messages: getListMessagesQueryKey({ sessionId: SESSION_ID }),
  session: getGetSessionQueryKey(SESSION_ID),
  otherSession: getGetSessionQueryKey(OTHER_SESSION_ID),
  openRun: getGetRunQueryKey('r-open'),
  endedRun: getGetRunQueryKey('r-ended'),
};

let queryClient: QueryClient;

const invalidated = (key: QueryKey) => queryClient.getQueryState(key)?.isInvalidated;
const invalidatedKeys = () =>
  Object.entries(keys)
    .filter(([, key]) => invalidated(key))
    .map(([name]) => name);

beforeEach(() => {
  queryClient = createTestQueryClient();
  for (const key of Object.values(keys)) queryClient.setQueryData(key, {});
  queryClient.setQueryData(keys.openRun, { finishedAt: null });
  queryClient.setQueryData(keys.endedRun, { finishedAt: '2026-11-16T00:00:00.000Z' });
});

describe('chat stream invalidations', () => {
  it('refreshes the session list', () => {
    invalidateSessionList(queryClient);

    expect(invalidatedKeys()).toEqual(['sessions']);
  });

  it('refreshes the message allowance', () => {
    invalidateMessageAllowance(queryClient);

    expect(invalidatedKeys()).toEqual(['allowance']);
  });

  it('refreshes the allowance and the Session once a send is accepted', () => {
    invalidateAfterSend(queryClient, SESSION_ID);

    expect(invalidatedKeys()).toEqual(['allowance', 'session']);
  });

  it('refreshes the one Run a Run event moved on', () => {
    invalidateRun(queryClient, 'r-open');

    expect(invalidatedKeys()).toEqual(['openRun']);
  });

  it('refreshes the list, messages, Session and every unfinished Run once a reply completes', () => {
    invalidateCompletedStream(queryClient, SESSION_ID);

    expect(invalidatedKeys()).toEqual(['sessions', 'messages', 'session', 'openRun']);
  });

  describe('invalidateRunThrottled', () => {
    let refetches: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      vi.useFakeTimers();
      refetches = vi.spyOn(queryClient, 'invalidateQueries');
    });
    afterEach(() => {
      // The throttle is module state: close any window a test left open.
      invalidateRun(queryClient, 'r-open');
      invalidateRun(queryClient, 'r-ended');
      vi.useRealTimers();
    });

    it('refreshes the first finished Step at once and a burst after it once per 500 ms', () => {
      invalidateRunThrottled(queryClient, 'r-open');
      expect(refetches).toHaveBeenCalledTimes(1);

      invalidateRunThrottled(queryClient, 'r-open');
      invalidateRunThrottled(queryClient, 'r-open');
      vi.advanceTimersByTime(499);
      expect(refetches).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1);
      expect(refetches).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(2000);
      expect(refetches).toHaveBeenCalledTimes(2);
    });

    it('refreshes again for a Step finishing after the window closed', () => {
      invalidateRunThrottled(queryClient, 'r-open');
      vi.advanceTimersByTime(500);
      invalidateRunThrottled(queryClient, 'r-open');

      expect(refetches).toHaveBeenCalledTimes(2);
    });

    it('lets the Run end refresh at once and drops the refresh still waiting', () => {
      invalidateRunThrottled(queryClient, 'r-open');
      invalidateRunThrottled(queryClient, 'r-open');
      invalidateRun(queryClient, 'r-open');
      vi.advanceTimersByTime(2000);

      expect(refetches).toHaveBeenCalledTimes(2);
    });

    it('throttles each Run on its own', () => {
      invalidateRunThrottled(queryClient, 'r-open');
      invalidateRunThrottled(queryClient, 'r-ended');

      expect(refetches).toHaveBeenCalledTimes(2);
    });
  });
});
