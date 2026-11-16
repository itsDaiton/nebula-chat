import { beforeEach, describe, expect, it } from 'vitest';
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
});
