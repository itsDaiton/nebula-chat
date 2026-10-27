import { AppError } from '@nebula-chat/errors';
import { describe, expect, it } from 'vitest';
import { getSession } from '@/libs/api/generated/sessions/sessions';
import { getGetSessionMockHandler } from '@/libs/api/generated/sessions/sessions.msw';
import { API_ROUTE, mockApiError } from '@/test/api';
import { server } from '@/test/msw';

const SESSION_ID = '11111111-1111-4111-8111-111111111111';

const aChatSession = {
  id: SESSION_ID,
  title: 'Chat',
  createdAt: '2026-01-01T00:00:00.000Z',
  archived: false,
  activeStreamId: null,
};

describe('axiosClient', () => {
  it('resolves with the response body', async () => {
    server.use(getGetSessionMockHandler(aChatSession));

    await expect(getSession(SESSION_ID)).resolves.toMatchObject({ title: 'Chat' });
  });

  it('rejects a failed request with an AppError', async () => {
    server.use(
      mockApiError('get', API_ROUTE.session, 404, {
        success: false,
        error: 'NotFound',
        message: 'Session not found',
      }),
    );

    await expect(getSession(SESSION_ID)).rejects.toSatisfy(
      (error) => error instanceof AppError && error.message === 'Session not found',
    );
  });

  it('passes a cancelled request through untouched', async () => {
    server.use(getGetSessionMockHandler(aChatSession));
    const controller = new AbortController();
    controller.abort();

    await expect(getSession(SESSION_ID, undefined, controller.signal)).rejects.not.toBeInstanceOf(
      AppError,
    );
  });

  it('sends the session cookie cross-origin', async () => {
    let credentials: RequestCredentials | undefined;
    server.use(
      getGetSessionMockHandler(({ request }) => {
        credentials = request.credentials;
        return aChatSession;
      }),
    );

    await getSession(SESSION_ID);

    expect(credentials).toBe('include');
  });
});
