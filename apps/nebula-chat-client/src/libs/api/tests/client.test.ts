import { AppError } from '@nebula-chat/errors';
import { describe, expect, it } from 'vitest';
import { getConversation } from '@/libs/api/generated/conversations/conversations';
import { getGetConversationMockHandler } from '@/libs/api/generated/conversations/conversations.msw';
import { API_ROUTE, mockApiError } from '@/test/api';
import { server } from '@/test/msw';

const CONVERSATION_ID = '11111111-1111-4111-8111-111111111111';

const aConversation = {
  id: CONVERSATION_ID,
  title: 'Chat',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('axiosClient', () => {
  it('resolves with the response body', async () => {
    server.use(getGetConversationMockHandler(aConversation));

    await expect(getConversation(CONVERSATION_ID)).resolves.toMatchObject({ title: 'Chat' });
  });

  it('rejects a failed request with an AppError', async () => {
    server.use(
      mockApiError('get', API_ROUTE.conversation, 404, {
        success: false,
        error: 'NotFound',
        message: 'Conversation not found',
      }),
    );

    await expect(getConversation(CONVERSATION_ID)).rejects.toSatisfy(
      (error) => error instanceof AppError && error.message === 'Conversation not found',
    );
  });

  it('passes a cancelled request through untouched', async () => {
    server.use(getGetConversationMockHandler(aConversation));
    const controller = new AbortController();
    controller.abort();

    await expect(
      getConversation(CONVERSATION_ID, undefined, controller.signal),
    ).rejects.not.toBeInstanceOf(AppError);
  });

  it('sends the session cookie cross-origin', async () => {
    let credentials: RequestCredentials | undefined;
    server.use(
      getGetConversationMockHandler(({ request }) => {
        credentials = request.credentials;
        return aConversation;
      }),
    );

    await getConversation(CONVERSATION_ID);

    expect(credentials).toBe('include');
  });
});
