import { AppError } from '@nebula-chat/errors';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { getConversation } from '@/libs/api/generated/conversations/conversations';
import { getGetConversationMockHandler } from '@/libs/api/generated/conversations/conversations.msw';
import { resources } from '@/resources';
import { API_ROUTE, mockApiError } from '@/test/api';
import { server } from '@/test/msw';

const CONVERSATION_ID = '11111111-1111-4111-8111-111111111111';

const rejectionOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('expected the request to reject');
};

describe('axiosClient', () => {
  it('resolves with the response body', async () => {
    server.use(
      getGetConversationMockHandler({
        id: CONVERSATION_ID,
        title: 'Chat',
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    );

    await expect(getConversation(CONVERSATION_ID)).resolves.toMatchObject({ title: 'Chat' });
  });

  it('rejects with the AppError an error envelope describes', async () => {
    server.use(
      mockApiError('get', API_ROUTE.conversation, 404, {
        success: false,
        error: 'NotFound',
        message: 'Conversation with id "x" not found',
      }),
    );

    const error = await rejectionOf(getConversation(CONVERSATION_ID));

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      code: 'NotFound',
      status: 404,
      message: 'Conversation with id "x" not found',
    });
  });

  it('classifies a body that is not an envelope by its status, with a generic message', async () => {
    server.use(mockApiError('get', API_ROUTE.conversation, 401, { message: 'nope' }));

    const error = await rejectionOf(getConversation(CONVERSATION_ID));

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      code: 'Unauthorized',
      message: resources.errors.requestFailed,
    });
  });

  it('rejects with an AppError when the server cannot be reached', async () => {
    server.use(http.get(API_ROUTE.conversation, () => HttpResponse.error()));

    const error = await rejectionOf(getConversation(CONVERSATION_ID));

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ code: 'Internal', message: resources.errors.network });
  });

  it('sends the session cookie cross-origin', async () => {
    // better-auth's session is a cookie on the API origin; without this the
    // browser drops it and every owner-scoped route reads as unauthenticated.
    let credentials: RequestCredentials | undefined;
    server.use(
      getGetConversationMockHandler(({ request }) => {
        credentials = request.credentials;
        return { id: CONVERSATION_ID, title: 'Chat', createdAt: '2026-01-01T00:00:00.000Z' };
      }),
    );

    await getConversation(CONVERSATION_ID);

    expect(credentials).toBe('include');
  });
});
