import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isAppError } from '@nebula-chat/errors';
import type { QueryClient } from '@tanstack/react-query';
import { createSession, getGetSessionQueryKey } from '@/libs/api/generated/sessions/sessions';
import { getCreateSessionMockHandler } from '@/libs/api/generated/sessions/sessions.msw';
import { getGetMessageAllowanceQueryKey, sendMessage } from '@/libs/api/generated/chat/chat';
import {
  getGetMessageAllowanceMockHandler,
  getSendMessageMockHandler,
} from '@/libs/api/generated/chat/chat.msw';
import { ErrorCode } from '@/libs/api/generated/model/errorCode';
import { SendMessageBodyMode } from '@/libs/api/generated/model/sendMessageBodyMode';
import type { SendMessageBodyModel } from '@/libs/api/generated/model/sendMessageBodyModel';
import { createChatSession, postMessage } from '@/modules/chat/streaming/sendReply';
import type { CreateSessionMutation, SendMessageMutation } from '@/modules/chat/types/types';
import { wakeWorker } from '@/shared/utils/wakeWorker';
import { aMeteredAllowance } from '@/test/allowance';
import { server } from '@/test/msw';
import { createTestQueryClient } from '@/test/render';

vi.mock('@/shared/utils/wakeWorker', () => ({ wakeWorker: vi.fn() }));

const SESSION_ID = '11111111-1111-4111-8111-111111111111';

// The generated request functions, shaped like the mutations the hook passes in.
const create: CreateSessionMutation = ({ data }) => createSession(data);
const send: SendMessageMutation = ({ sessionId, data }) => sendMessage(sessionId, data);

let queryClient: QueryClient;
let createdTitle: string | undefined;
let createdReplyMode: string | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  queryClient = createTestQueryClient();
  createdTitle = undefined;
  createdReplyMode = undefined;
  server.use(
    getCreateSessionMockHandler(async ({ request }) => {
      const body = (await request.json()) as { title: string; replyMode: string };
      createdTitle = body.title;
      createdReplyMode = body.replyMode;
      return {
        id: SESSION_ID,
        title: createdTitle,
        createdAt: '2026-11-17T00:00:00.000Z',
        archived: false,
        archivedAt: null,
        messageCount: 0,
        replyMode: 'direct' as const,
      };
    }),
  );
});

describe('createChatSession', () => {
  it("creates the Session, titled by the message's first 50 characters", async () => {
    server.use(getGetMessageAllowanceMockHandler({ metered: false }));

    const id = await createChatSession(
      queryClient,
      create,
      'x'.repeat(60),
      SendMessageBodyMode.direct,
    );

    expect(id).toBe(SESSION_ID);
    expect(createdTitle).toBe('x'.repeat(50));
  });

  it("fixes the Session's Reply mode with the mode of its first message", async () => {
    server.use(getGetMessageAllowanceMockHandler({ metered: false }));

    await createChatSession(queryClient, create, 'plan it', SendMessageBodyMode.run);

    expect(createdReplyMode).toBe('run');
  });

  it('refuses a capped Guest before any Session is created', async () => {
    server.use(getGetMessageAllowanceMockHandler(aMeteredAllowance(0)));

    const error = await createChatSession(
      queryClient,
      create,
      'hi',
      SendMessageBodyMode.direct,
    ).catch((err: unknown) => err);

    expect(isAppError(error) && error.code).toBe(ErrorCode.MessageAllowanceReached);
    expect(createdTitle).toBeUndefined();
  });

  it('creates the Session for a metered Guest with messages left', async () => {
    server.use(getGetMessageAllowanceMockHandler(aMeteredAllowance(1)));

    await expect(
      createChatSession(queryClient, create, 'hi', SendMessageBodyMode.direct),
    ).resolves.toBe(SESSION_ID);
  });
});

describe('postMessage', () => {
  it('wakes the worker, sends, and refreshes the allowance and Session', async () => {
    server.use(getSendMessageMockHandler({ messageId: 'm1', streamId: 'st1', runId: 'r1' }));
    queryClient.setQueryData(getGetMessageAllowanceQueryKey(), {});
    queryClient.setQueryData(getGetSessionQueryKey(SESSION_ID), {});

    const sent = await postMessage(queryClient, send, {
      sessionId: SESSION_ID,
      content: 'hi',
      mode: SendMessageBodyMode.run,
      model: 'gpt-4o-mini' as SendMessageBodyModel,
    });

    expect(sent).toMatchObject({ streamId: 'st1', runId: 'r1' });
    expect(wakeWorker).toHaveBeenCalledOnce();
    expect(queryClient.getQueryState(getGetMessageAllowanceQueryKey())?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(getGetSessionQueryKey(SESSION_ID))?.isInvalidated).toBe(true);
  });
});
