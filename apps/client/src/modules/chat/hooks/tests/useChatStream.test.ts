import { act, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import {
  getGetSessionQueryKey,
  getListSessionsInfiniteQueryKey,
} from '@/libs/api/generated/sessions/sessions';
import { getCreateSessionMockHandler } from '@/libs/api/generated/sessions/sessions.msw';
import { getGetMessageAllowanceQueryKey } from '@/libs/api/generated/chat/chat';
import { getSendMessageMockHandler } from '@/libs/api/generated/chat/chat.msw';
import { getListMessagesQueryKey } from '@/libs/api/generated/messages/messages';
import { useChatStream } from '@/modules/chat/hooks/useChatStream';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { resources } from '@/resources';
import { API_ROUTE, mockApiError } from '@/test/api';
import { mockReplyStream, sseFrame as frame } from '@/test/chat';
import { server } from '@/test/msw';
import { createTestQueryClient, renderHookWithQueryClient } from '@/test/render';

const navigate = vi.fn();

vi.mock('react-router', () => ({ useNavigate: () => navigate }));

const NEW_SESSION_ID = '11111111-1111-4111-8111-111111111111';
const MESSAGE_ID = '22222222-2222-4222-8222-222222222222';
const STREAM_ID = '33333333-3333-4333-8333-333333333333';
const EXISTING_ID = '44444444-4444-4444-8444-444444444444';

const sendMessage = async (result: { current: ReturnType<typeof useChatStream> }) => {
  await act(async () => {
    await result.current.streamMessage({
      model: 'gpt-4o-mini',
      messages: [{ id: 'u1', role: 'user', content: 'what is 2+2?' }],
    });
  });
};

/** Serves the reply stream, plus a send (and a new Session) that point at it. */
const streamFrames = (...frames: string[]) => server.use(mockReplyStream(...frames));

const history = () => useChatStreamStore.getState().history;
const assistantContent = () => history().at(-1)?.content;

beforeEach(() => {
  vi.clearAllMocks();
  useChatStreamStore.setState({
    history: [],
    isStreaming: false,
    isPostStreamNavigation: false,
    error: null,
    usage: null,
    sessionId: undefined,
    isMessageAllowanceReached: false,
  });
  useMessageStore.setState({ message: '' });
  server.use(
    getCreateSessionMockHandler(({ request }) =>
      request.json().then((body) => ({
        id: NEW_SESSION_ID,
        title: (body as { title: string }).title,
        createdAt: '2026-10-20T00:00:00.000Z',
      })),
    ),
    getSendMessageMockHandler({ messageId: MESSAGE_ID, streamId: STREAM_ID }),
  );
});

describe('useChatStream — token streaming', () => {
  it('accumulates tokens into the trailing assistant message', async () => {
    streamFrames(
      frame('token', { token: '2+2' }),
      frame('token', { token: ' is 4' }),
      frame('end', {}),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    await waitFor(() => expect(assistantContent()).toBe('2+2 is 4'));
  });

  it('seeds an empty assistant message before the first token arrives', async () => {
    streamFrames(frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    expect(history()).toHaveLength(2);
    expect(history().at(-1)?.role).toBe('assistant');
  });

  it('reassembles a frame split across chunk boundaries', async () => {
    // The reader hands back arbitrary byte slices, so the parser must buffer a partial line.
    streamFrames('event: token\ndata: {"tok', 'en":"split"}\n\n', frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    await waitFor(() => expect(assistantContent()).toBe('split'));
  });

  it('reads past entry ids and keep-alive comments', async () => {
    streamFrames(
      ': keep-alive\n\n',
      frame('token', { token: 'ok' }, '1700000000000-1'),
      frame('end', {}, '1700000000000-2'),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    await waitFor(() => expect(assistantContent()).toBe('ok'));
    expect(useChatStreamStore.getState().error).toBeNull();
  });

  it('stops streaming once the end event arrives', async () => {
    useChatStreamStore.setState({ sessionId: EXISTING_ID });
    streamFrames(frame('token', { token: 'x' }), frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    await waitFor(() => expect(useChatStreamStore.getState().isStreaming).toBe(false));
  });

  it('ignores an event name outside the known set', async () => {
    streamFrames(frame('sneaky', { token: 'nope' }), frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    expect(assistantContent()).toBe('');
  });

  it('skips a data line that is not valid JSON', async () => {
    streamFrames(
      'event: token\ndata: not json\n\n',
      frame('token', { token: 'ok' }),
      frame('end', {}),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    await waitFor(() => expect(assistantContent()).toBe('ok'));
  });

  it('ignores a token payload that is not a string', async () => {
    streamFrames(frame('token', { token: 42 }), frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    expect(assistantContent()).toBe('');
  });
});

describe('useChatStream — usage and errors', () => {
  it('records the reported usage', async () => {
    streamFrames(
      frame('usage', { promptTokens: 10, completionTokens: 4, totalTokens: 14 }),
      frame('end', {}),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    await waitFor(() =>
      expect(useChatStreamStore.getState().usage).toEqual({
        promptTokens: 10,
        completionTokens: 4,
        totalTokens: 14,
      }),
    );
  });

  it('surfaces the message of an error event in place of the reply', async () => {
    streamFrames(
      frame('error', { success: false, error: 'BadRequest', message: 'Unsupported model: gpt-0' }),
      frame('end', {}),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    expect(useChatStreamStore.getState().error).toBe('Unsupported model: gpt-0');
    expect(assistantContent()).toBe('Unsupported model: gpt-0');
    expect(useChatStreamStore.getState().isStreaming).toBe(false);
  });

  it('falls back to a generic message when the error event carries no envelope', async () => {
    streamFrames(frame('error', { error: 'Rate limit exceeded.' }), frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    expect(useChatStreamStore.getState().error).toBe(resources.chat.streamError);
  });

  it('reports a stream that closes before its end event', async () => {
    streamFrames(frame('token', { token: 'half' }));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    expect(useChatStreamStore.getState().error).toBe(resources.chat.streamError);
    expect(useChatStreamStore.getState().isStreaming).toBe(false);
  });

  it('reports a stream that cannot be opened by the message of its envelope', async () => {
    server.use(
      mockApiError('get', API_ROUTE.replyStream, 404, {
        success: false,
        error: 'NotFound',
        message: 'Stream not found',
      }),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    expect(useChatStreamStore.getState().error).toBe('Stream not found');
  });

  it('reports a stream that cannot be opened and has no envelope with the generic message', async () => {
    server.use(http.get(API_ROUTE.replyStream, () => new HttpResponse(null, { status: 502 })));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    expect(useChatStreamStore.getState().error).toBe(resources.chat.streamError);
  });

  it('reports a refused send by the message of its error envelope', async () => {
    server.use(
      mockApiError('post', API_ROUTE.sendMessage, 429, {
        success: false,
        error: 'TooManyRequests',
        message: 'Rate limit exceeded, retry in 1 minute',
      }),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    expect(useChatStreamStore.getState().error).toBe('Rate limit exceeded, retry in 1 minute');
    expect(useChatStreamStore.getState().isStreaming).toBe(false);
  });
});

describe('useChatStream — message allowance', () => {
  const allowanceEnvelope = {
    success: false,
    error: 'MessageAllowanceReached',
    message: 'Message allowance exceeded: a Guest can send at most 10 messages.',
  };

  it('flags the reached allowance instead of reporting an error', async () => {
    server.use(mockApiError('post', API_ROUTE.sendMessage, 403, allowanceEnvelope));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    expect(useChatStreamStore.getState()).toMatchObject({
      isMessageAllowanceReached: true,
      isStreaming: false,
      error: null,
    });
  });

  it('returns the refused message to the composer instead of the history', async () => {
    server.use(mockApiError('post', API_ROUTE.sendMessage, 403, allowanceEnvelope));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    expect(history()).toEqual([]);
    expect(useMessageStore.getState().message).toBe('what is 2+2?');
  });

  it('reports a plain Forbidden as an error, not the reached allowance', async () => {
    server.use(
      mockApiError('post', API_ROUTE.sendMessage, 403, {
        success: false,
        error: 'Forbidden',
        message: 'Forbidden.',
      }),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    expect(useChatStreamStore.getState().error).toBe('Forbidden.');
    expect(useChatStreamStore.getState().isMessageAllowanceReached).toBe(false);
  });

  it('clears the reached allowance once a later send goes through', async () => {
    useChatStreamStore.setState({ isMessageAllowanceReached: true });
    streamFrames(frame('token', { token: 'welcome back' }), frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    expect(useChatStreamStore.getState().isMessageAllowanceReached).toBe(false);
    await waitFor(() => expect(assistantContent()).toBe('welcome back'));
  });
});

describe('useChatStream — send, then subscribe', () => {
  it('sends the newest message as a Direct reply on the picked Model', async () => {
    let received: unknown;
    server.use(
      getSendMessageMockHandler(async ({ request }) => {
        received = await request.json();
        return { messageId: MESSAGE_ID, streamId: STREAM_ID };
      }),
    );
    streamFrames(frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await act(async () => {
      await result.current.streamMessage({
        model: 'gpt-4o',
        messages: [
          { id: 'u1', role: 'user', content: 'older' },
          { id: 'u2', role: 'user', content: 'newest' },
        ],
      });
    });

    expect(received).toEqual({ content: 'newest', mode: 'direct', model: 'gpt-4o' });
  });

  it('subscribes to the stream the send answered with', async () => {
    let opened: unknown;
    server.use(
      http.get(API_ROUTE.replyStream, ({ params }) => {
        opened = params['streamId'];
        return new HttpResponse(frame('end', {}), {
          headers: { 'Content-Type': 'text/event-stream' },
        });
      }),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    expect(opened).toBe(STREAM_ID);
  });

  it('starts a new chat by creating a Session titled after the message, then sends to it', async () => {
    let title: unknown;
    let sentTo: unknown;
    server.use(
      getCreateSessionMockHandler(async ({ request }) => {
        title = ((await request.json()) as { title: string }).title;
        return { id: NEW_SESSION_ID, title: 'x', createdAt: '2026-10-20T00:00:00.000Z' };
      }),
      getSendMessageMockHandler(({ params }) => {
        sentTo = params['sessionId'];
        return { messageId: MESSAGE_ID, streamId: STREAM_ID };
      }),
    );
    streamFrames(frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    expect(title).toBe('what is 2+2?');
    expect(sentTo).toBe(NEW_SESSION_ID);
    expect(useChatStreamStore.getState().sessionId).toBe(NEW_SESSION_ID);
  });

  it('navigates to the new Session once the reply ends', async () => {
    streamFrames(frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    expect(navigate).toHaveBeenCalledWith(`/s/${NEW_SESSION_ID}`, { replace: true });
  });

  it('keeps isStreaming true through the post-stream navigation window', async () => {
    // Dropping it here would render a frame with no session and no stream: an empty-state flicker.
    streamFrames(frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    expect(useChatStreamStore.getState()).toMatchObject({
      isPostStreamNavigation: true,
      isStreaming: true,
    });
  });

  it('continues an active Session without creating one or navigating', async () => {
    useChatStreamStore.setState({ sessionId: EXISTING_ID });
    let created = false;
    let sentTo: unknown;
    server.use(
      http.post(API_ROUTE.sessions, () => {
        created = true;
        return HttpResponse.json({}, { status: 201 });
      }),
      getSendMessageMockHandler(({ params }) => {
        sentTo = params['sessionId'];
        return { messageId: MESSAGE_ID, streamId: STREAM_ID };
      }),
    );
    streamFrames(frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    expect(created).toBe(false);
    expect(sentTo).toBe(EXISTING_ID);
    expect(useChatStreamStore.getState().isStreaming).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('useChatStream — query cache', () => {
  /** A query client holding fresh data for `keys`, so invalidation is observable. */
  const primedClient = (...keys: QueryKey[]) => {
    const queryClient = createTestQueryClient();
    for (const key of keys) queryClient.setQueryData(key, []);
    return queryClient;
  };

  const isInvalidated = (queryClient: QueryClient, key: QueryKey) =>
    queryClient.getQueryState(key)?.isInvalidated;

  it('refreshes the sidebar as soon as the new Session exists, before the reply', async () => {
    // A stream that never ends: the list must refresh on creation, not only on completion.
    streamFrames(frame('token', { token: 'x' }));
    const queryClient = primedClient(getListSessionsInfiniteQueryKey());
    const { result } = renderHookWithQueryClient(() => useChatStream(), { queryClient });

    await sendMessage(result);

    expect(isInvalidated(queryClient, getListSessionsInfiniteQueryKey())).toBe(true);
  });

  it('invalidates the list, the Session and its messages when the reply ends', async () => {
    useChatStreamStore.setState({ sessionId: EXISTING_ID });
    streamFrames(frame('token', { token: 'x' }), frame('end', {}));
    const queryClient = primedClient(
      getListSessionsInfiniteQueryKey(),
      getGetSessionQueryKey(EXISTING_ID),
      getListMessagesQueryKey(),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream(), { queryClient });

    await sendMessage(result);

    expect(isInvalidated(queryClient, getListSessionsInfiniteQueryKey())).toBe(true);
    expect(isInvalidated(queryClient, getGetSessionQueryKey(EXISTING_ID))).toBe(true);
    expect(isInvalidated(queryClient, getListMessagesQueryKey())).toBe(true);
  });

  it('refreshes the message allowance as soon as the send is accepted', async () => {
    streamFrames(frame('error', { success: false, error: 'Internal', message: 'boom' }));
    const queryClient = primedClient(getGetMessageAllowanceQueryKey());
    const { result } = renderHookWithQueryClient(() => useChatStream(), { queryClient });

    await sendMessage(result);

    expect(isInvalidated(queryClient, getGetMessageAllowanceQueryKey())).toBe(true);
  });

  it('refreshes the message allowance after a send refused at it', async () => {
    server.use(
      mockApiError('post', API_ROUTE.sendMessage, 403, {
        success: false,
        error: 'MessageAllowanceReached',
        message: 'Message allowance exceeded: a Guest can send at most 10 messages.',
      }),
    );
    const queryClient = primedClient(getGetMessageAllowanceQueryKey());
    const { result } = renderHookWithQueryClient(() => useChatStream(), { queryClient });

    await sendMessage(result);

    expect(isInvalidated(queryClient, getGetMessageAllowanceQueryKey())).toBe(true);
  });

  it('leaves the message allowance alone when no message was counted', async () => {
    server.use(mockApiError('post', API_ROUTE.sendMessage, 500, {}));
    const queryClient = primedClient(getGetMessageAllowanceQueryKey());
    const { result } = renderHookWithQueryClient(() => useChatStream(), { queryClient });

    await sendMessage(result);

    expect(isInvalidated(queryClient, getGetMessageAllowanceQueryKey())).toBe(false);
  });

  it('leaves the messages alone when the reply fails', async () => {
    useChatStreamStore.setState({ sessionId: EXISTING_ID });
    streamFrames(frame('error', { success: false, error: 'Internal', message: 'boom' }));
    const queryClient = primedClient(getListMessagesQueryKey());
    const { result } = renderHookWithQueryClient(() => useChatStream(), { queryClient });

    await sendMessage(result);

    expect(isInvalidated(queryClient, getListMessagesQueryKey())).toBe(false);
  });
});

describe('useChatStream — lifecycle', () => {
  it('clearPostStream drops both streaming flags together', () => {
    useChatStreamStore.setState({ isStreaming: true, isPostStreamNavigation: true });
    const { result } = renderHookWithQueryClient(() => useChatStream());

    act(() => result.current.clearPostStream());

    expect(useChatStreamStore.getState()).toMatchObject({
      isStreaming: false,
      isPostStreamNavigation: false,
    });
  });

  it('abort stops the stream without recording an error', () => {
    const { result } = renderHookWithQueryClient(() => useChatStream());

    act(() => result.current.abort());

    expect(useChatStreamStore.getState().isStreaming).toBe(false);
    expect(useChatStreamStore.getState().error).toBeNull();
  });

  it('aborting while the reply streams ends it without recording an error', async () => {
    useChatStreamStore.setState({ sessionId: EXISTING_ID });
    server.use(http.get(API_ROUTE.replyStream, () => new Promise<Response>(() => {})));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    let sent: Promise<void> | undefined;
    act(() => {
      sent = result.current.streamMessage({
        model: 'gpt-4o-mini',
        messages: [{ id: 'u1', role: 'user', content: 'hi' }],
      });
    });
    expect(useChatStreamStore.getState().isStreaming).toBe(true);

    act(() => result.current.abort());
    await act(async () => {
      await sent;
    });

    expect(useChatStreamStore.getState().isStreaming).toBe(false);
    expect(useChatStreamStore.getState().error).toBeNull();
  });

  it('never opens the stream when aborted while the send is in flight', async () => {
    useChatStreamStore.setState({ sessionId: EXISTING_ID });
    let opened = false;
    server.use(
      http.get(API_ROUTE.replyStream, () => {
        opened = true;
        return new HttpResponse(frame('end', {}));
      }),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream());

    let sent: Promise<void> | undefined;
    act(() => {
      sent = result.current.streamMessage({
        model: 'gpt-4o-mini',
        messages: [{ id: 'u1', role: 'user', content: 'hi' }],
      });
    });
    act(() => result.current.abort());
    await act(async () => {
      await sent;
    });

    expect(opened).toBe(false);
  });
});
