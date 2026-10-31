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
import {
  getGetMessageAllowanceMockHandler,
  getSendMessageMockHandler,
} from '@/libs/api/generated/chat/chat.msw';
import { getListMessagesQueryKey } from '@/libs/api/generated/messages/messages';
import { getListMessagesMockHandler } from '@/libs/api/generated/messages/messages.msw';
import { useChatStream } from '@/modules/chat/hooks/useChatStream';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { resources } from '@/resources';
import { API_ROUTE, mockApiError } from '@/test/api';
import { mockReplyStream, sseFrame as frame } from '@/test/chat';
import { server } from '@/test/msw';
import { createTestQueryClient, renderHookWithQueryClient } from '@/test/render';

const navigate = vi.fn();

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));

const NEW_SESSION_ID = '11111111-1111-4111-8111-111111111111';
const MESSAGE_ID = '22222222-2222-4222-8222-222222222222';
const STREAM_ID = '33333333-3333-4333-8333-333333333333';
const EXISTING_ID = '44444444-4444-4444-8444-444444444444';

// Reconnects at once, so a dropped stream's retries take no wall-clock time.
const NO_BACKOFF = { reconnectDelaysMs: [0, 0, 0] };

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
    streamId: null,
    isStopRequested: false,
  });
  useMessageStore.setState({ message: '' });
  server.use(
    getCreateSessionMockHandler(({ request }) =>
      request.json().then((body) => ({
        id: NEW_SESSION_ID,
        title: (body as { title: string }).title,
        createdAt: '2026-10-20T00:00:00.000Z',
        archived: false,
      })),
    ),
    getSendMessageMockHandler({ messageId: MESSAGE_ID, streamId: STREAM_ID }),
    getGetMessageAllowanceMockHandler({ metered: false }),
  );
});

describe('useChatStream — token streaming', () => {
  it('accumulates tokens into the trailing assistant message', async () => {
    streamFrames(
      frame('token', { token: '2+2' }),
      frame('token', { token: ' is 4' }),
      frame('end', {}),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    await waitFor(() => expect(assistantContent()).toBe('2+2 is 4'));
  });

  it('seeds an empty assistant message before the first token arrives', async () => {
    streamFrames(frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    expect(history()).toHaveLength(2);
    expect(history().at(-1)?.role).toBe('assistant');
  });

  it('reassembles a frame split across chunk boundaries', async () => {
    // The reader hands back arbitrary byte slices, so the parser must buffer a partial line.
    streamFrames('event: token\ndata: {"tok', 'en":"split"}\n\n', frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    await waitFor(() => expect(assistantContent()).toBe('split'));
  });

  it('reads past entry ids and keep-alive comments', async () => {
    streamFrames(
      ': keep-alive\n\n',
      frame('token', { token: 'ok' }, '1700000000000-1'),
      frame('end', {}, '1700000000000-2'),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    await waitFor(() => expect(assistantContent()).toBe('ok'));
    expect(useChatStreamStore.getState().error).toBeNull();
  });

  it('stops streaming once the end event arrives', async () => {
    useChatStreamStore.setState({ sessionId: EXISTING_ID });
    streamFrames(frame('token', { token: 'x' }), frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    await waitFor(() => expect(useChatStreamStore.getState().isStreaming).toBe(false));
  });

  it('ignores an event name outside the known set', async () => {
    streamFrames(frame('sneaky', { token: 'nope' }), frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    expect(assistantContent()).toBe('');
  });

  it('skips a data line that is not valid JSON', async () => {
    streamFrames(
      'event: token\ndata: not json\n\n',
      frame('token', { token: 'ok' }),
      frame('end', {}),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    await waitFor(() => expect(assistantContent()).toBe('ok'));
  });

  it('ignores a token payload that is not a string', async () => {
    streamFrames(frame('token', { token: 42 }), frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

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
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    await waitFor(() =>
      expect(useChatStreamStore.getState().usage).toEqual({
        promptTokens: 10,
        completionTokens: 4,
        totalTokens: 14,
      }),
    );
  });

  it('shows the reply token count on its meta row as soon as the stream reports it', async () => {
    streamFrames(
      frame('token', { token: 'hi' }),
      frame('usage', { promptTokens: 10, completionTokens: 4, totalTokens: 14 }),
      frame('end', {}),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    await waitFor(() =>
      expect(useChatStreamStore.getState().history.at(-1)).toMatchObject({
        role: 'assistant',
        tokenCount: 14,
      }),
    );
  });

  it('surfaces the message of an error event in place of the reply', async () => {
    streamFrames(
      frame('error', { success: false, error: 'BadRequest', message: 'Unsupported model: gpt-0' }),
      frame('end', {}),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    expect(useChatStreamStore.getState().error).toBe('Unsupported model: gpt-0');
    expect(assistantContent()).toBe('Unsupported model: gpt-0');
  });

  it('falls back to a generic message when the error event carries no envelope', async () => {
    streamFrames(frame('error', { error: 'Rate limit exceeded.' }), frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    expect(useChatStreamStore.getState().error).toBe(resources.chat.streamError);
  });

  it('reports a stream that keeps closing before its end event, once its reconnects run out', async () => {
    streamFrames(frame('token', { token: 'half' }));
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    expect(useChatStreamStore.getState().error).toBe(resources.chat.streamError);
  });

  it('reports a stream that cannot be opened by the message of its envelope', async () => {
    server.use(
      mockApiError('get', API_ROUTE.replyStream, 403, {
        success: false,
        error: 'Forbidden',
        message: 'Stream forbidden',
      }),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    expect(useChatStreamStore.getState().error).toBe('Stream forbidden');
  });

  it('reports a stream that cannot be opened and has no envelope with the generic message', async () => {
    server.use(http.get(API_ROUTE.replyStream, () => new HttpResponse(null, { status: 502 })));
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

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
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    expect(useChatStreamStore.getState().error).toBe('Rate limit exceeded, retry in 1 minute');
  });
});

describe('useChatStream — a failed first reply', () => {
  const GOES_TO_NEW_SESSION = { to: '/s/$id', params: { id: NEW_SESSION_ID }, replace: true };

  // The route must carry the Session before streaming stops, or the chat resets to the greeting.
  const expectHeldForNavigation = () => {
    expect(navigate).toHaveBeenCalledWith(GOES_TO_NEW_SESSION);
    expect(useChatStreamStore.getState()).toMatchObject({
      isPostStreamNavigation: true,
      isStreaming: true,
      sessionId: NEW_SESSION_ID,
    });
  };

  it('keeps the message and the error in the history and moves to the Session it created', async () => {
    streamFrames(frame('error', { success: false, error: 'Internal', message: 'Provider down' }));
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    expect(history().map((m) => m.content)).toEqual(['what is 2+2?', 'Provider down']);
    expectHeldForNavigation();
  });

  it('does the same for a send the server refuses', async () => {
    server.use(
      mockApiError('post', API_ROUTE.sendMessage, 429, {
        success: false,
        error: 'TooManyRequests',
        message: 'Rate limit exceeded, retry in 1 minute',
      }),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    expect(assistantContent()).toBe('Rate limit exceeded, retry in 1 minute');
    expectHeldForNavigation();
  });

  it('does the same for a stream that runs out of reconnects', async () => {
    streamFrames(frame('token', { token: 'half' }));
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    expect(assistantContent()).toBe(resources.chat.streamError);
    expectHeldForNavigation();
  });

  it('stays on the new chat when no Session was created to move to', async () => {
    server.use(
      mockApiError('post', API_ROUTE.sessions, 500, {
        success: false,
        error: 'Internal',
        message: 'Could not create the Session',
      }),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    expect(assistantContent()).toBe('Could not create the Session');
    expect(navigate).not.toHaveBeenCalled();
    expect(useChatStreamStore.getState().isStreaming).toBe(false);
  });

  it('does not navigate when the failed reply belongs to a Session already open', async () => {
    useChatStreamStore.setState({ sessionId: EXISTING_ID });
    streamFrames(frame('error', { success: false, error: 'Internal', message: 'Provider down' }));
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    expect(navigate).not.toHaveBeenCalled();
    expect(useChatStreamStore.getState().isStreaming).toBe(false);
  });
});

describe('useChatStream — reconnecting', () => {
  it('reconnects a dropped stream after the last event it saw, duplicating no token', async () => {
    useChatStreamStore.setState({ sessionId: EXISTING_ID });
    const resumedAfter: (string | null)[] = [];
    server.use(
      http.get(API_ROUTE.replyStream, ({ request }) => {
        const lastEventId = new URL(request.url).searchParams.get('lastEventId');
        resumedAfter.push(lastEventId);
        // The first connection drops after two tokens; the second picks up after the second.
        const body =
          lastEventId === null
            ? frame('token', { token: 'Two' }, '1-1') + frame('token', { token: ' plus' }, '1-2')
            : frame('token', { token: ' two' }, '1-3') + frame('end', {}, '1-4');
        return new HttpResponse(body, { headers: { 'Content-Type': 'text/event-stream' } });
      }),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    expect(resumedAfter).toEqual([null, '1-2']);
    expect(assistantContent()).toBe('Two plus two');
    expect(useChatStreamStore.getState()).toMatchObject({ isStreaming: false, error: null });
  });

  it('skips an event it already applied, should a reconnect replay it', async () => {
    useChatStreamStore.setState({ sessionId: EXISTING_ID });
    let connections = 0;
    server.use(
      http.get(API_ROUTE.replyStream, () => {
        connections += 1;
        const body =
          connections === 1
            ? frame('token', { token: 'a' }, '1-1')
            : frame('token', { token: 'a' }, '1-1') +
              frame('token', { token: 'b' }, '1-2') +
              frame('end', {}, '1-3');
        return new HttpResponse(body, { headers: { 'Content-Type': 'text/event-stream' } });
      }),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    expect(assistantContent()).toBe('ab');
  });

  it('reconnects when the network fails to open the stream', async () => {
    useChatStreamStore.setState({ sessionId: EXISTING_ID });
    let connections = 0;
    server.use(
      http.get(API_ROUTE.replyStream, () => {
        connections += 1;
        if (connections === 1) return HttpResponse.error();
        return new HttpResponse(frame('token', { token: 'ok' }, '1-1') + frame('end', {}, '1-2'), {
          headers: { 'Content-Type': 'text/event-stream' },
        });
      }),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    expect(assistantContent()).toBe('ok');
    expect(useChatStreamStore.getState().error).toBeNull();
  });

  it('shows the saved assistant Message once the stream has expired', async () => {
    useChatStreamStore.setState({ sessionId: EXISTING_ID });
    server.use(
      mockApiError('get', API_ROUTE.replyStream, 404, {
        success: false,
        error: 'NotFound',
        message: 'Stream not found',
      }),
      getListMessagesMockHandler([
        {
          id: MESSAGE_ID,
          sessionId: EXISTING_ID,
          role: 'user',
          content: 'what is 2+2?',
          tokenCount: null,
          cached: false,
          model: null,
          estimatedCostUsd: null,
          runId: null,
          contextTokens: null,
          contextMessages: null,
          createdAt: '2026-10-20T00:00:00.000Z',
        },
        {
          id: STREAM_ID,
          sessionId: EXISTING_ID,
          role: 'assistant',
          content: '4',
          tokenCount: 1,
          cached: false,
          model: null,
          estimatedCostUsd: null,
          runId: null,
          contextTokens: null,
          contextMessages: null,
          createdAt: '2026-10-20T00:00:01.000Z',
        },
      ]),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    expect(history()).toEqual([
      {
        id: MESSAGE_ID,
        role: 'user',
        content: 'what is 2+2?',
        tokenCount: null,
        model: null,
        estimatedCostUsd: null,
        runId: null,
      },
      {
        id: STREAM_ID,
        role: 'assistant',
        content: '4',
        tokenCount: 1,
        model: null,
        estimatedCostUsd: null,
        runId: null,
      },
    ]);
    expect(useChatStreamStore.getState()).toMatchObject({ isStreaming: false, error: null });
  });
});

describe('useChatStream — stopping a reply', () => {
  /** A stream that sends one token, then holds until the reply is cancelled and ends it as such. */
  const stoppableStream = () => {
    let cancelled: string | undefined;
    let endIt: () => void = () => undefined;
    server.use(
      http.get(API_ROUTE.replyStream, () => {
        const encoder = new TextEncoder();
        return new HttpResponse(
          new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode(frame('token', { token: 'Two' }, '1-1')));
              endIt = () => {
                controller.enqueue(encoder.encode(frame('end', { reason: 'cancelled' }, '1-2')));
                controller.close();
              };
              // Like the Redis flag, a cancel that landed before the stream opened still ends it.
              if (cancelled) endIt();
            },
          }),
          { headers: { 'Content-Type': 'text/event-stream' } },
        );
      }),
      http.post(`${API_ROUTE.replyStream}/cancel`, ({ params }) => {
        cancelled = params['streamId'] as string;
        endIt();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    return { cancelledStream: () => cancelled };
  };

  it('asks the server to cancel the reply, keeping what had streamed', async () => {
    useChatStreamStore.setState({ sessionId: EXISTING_ID });
    const { cancelledStream } = stoppableStream();
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    let sent: Promise<void> | undefined;
    act(() => {
      sent = result.current.streamMessage({
        model: 'gpt-4o-mini',
        messages: [{ id: 'u1', role: 'user', content: 'what is 2+2?' }],
      });
    });
    await waitFor(() => expect(assistantContent()).toBe('Two'));
    await act(async () => {
      await result.current.stop();
      await sent;
    });

    expect(cancelledStream()).toBe(STREAM_ID);
    expect(assistantContent()).toBe('Two');
    expect(useChatStreamStore.getState()).toMatchObject({ isStreaming: false, error: null });
  });

  it('drops the empty reply of a reply stopped before its first token', async () => {
    useChatStreamStore.setState({ sessionId: EXISTING_ID });
    streamFrames(frame('end', { reason: 'cancelled' }, '1-1'));
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    expect(history()).toEqual([{ id: 'u1', role: 'user', content: 'what is 2+2?' }]);
    expect(useChatStreamStore.getState().isStreaming).toBe(false);
  });

  it('flags a stopped reply, and clears the flag on the next send', async () => {
    useChatStreamStore.setState({ sessionId: EXISTING_ID });
    streamFrames(frame('end', { reason: 'cancelled' }, '1-1'));
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);
    expect(useChatStreamStore.getState().isReplyStopped).toBe(true);

    streamFrames(frame('token', { token: 'ok' }, '1-1'), frame('end', {}, '1-2'));
    await sendMessage(result);

    expect(useChatStreamStore.getState().isReplyStopped).toBe(false);
  });

  it('cancels a reply stopped while its message was still being sent', async () => {
    useChatStreamStore.setState({ sessionId: EXISTING_ID });
    const { cancelledStream } = stoppableStream();
    let releaseSend: (() => void) | undefined;
    server.use(
      getSendMessageMockHandler(async () => {
        await new Promise<void>((resolve) => {
          releaseSend = resolve;
        });
        return { messageId: MESSAGE_ID, streamId: STREAM_ID };
      }),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    let sent: Promise<void> | undefined;
    act(() => {
      sent = result.current.streamMessage({
        model: 'gpt-4o-mini',
        messages: [{ id: 'u1', role: 'user', content: 'what is 2+2?' }],
      });
    });
    // Stop while the send is held at the server, which only a request that has arrived can be.
    await waitFor(() => expect(releaseSend).toBeDefined());
    await act(async () => {
      await result.current.stop();
    });
    await act(async () => {
      releaseSend?.();
      await sent;
    });

    expect(cancelledStream()).toBe(STREAM_ID);
    expect(useChatStreamStore.getState().isStreaming).toBe(false);
  });

  it('does nothing when no reply is streaming', async () => {
    const { cancelledStream } = stoppableStream();
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await act(async () => {
      await result.current.stop();
    });

    expect(cancelledStream()).toBeUndefined();
  });
});

describe('useChatStream — re-attaching', () => {
  it('follows a reply still in flight from its start, after the saved messages', async () => {
    let resumedAfter: string | null | undefined;
    server.use(
      http.get(API_ROUTE.replyStream, ({ request }) => {
        resumedAfter = new URL(request.url).searchParams.get('lastEventId');
        return new HttpResponse(
          frame('token', { token: 'Two' }, '1-1') +
            frame('token', { token: ' plus two' }, '1-2') +
            frame('end', {}, '1-3'),
          { headers: { 'Content-Type': 'text/event-stream' } },
        );
      }),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    useChatStreamStore.setState({
      sessionId: EXISTING_ID,
      history: [{ id: MESSAGE_ID, role: 'user', content: 'what is 2+2?' }],
    });

    await act(async () => {
      await result.current.resumeStream({ sessionId: EXISTING_ID, streamId: STREAM_ID });
    });

    expect(resumedAfter).toBeNull();
    expect(history()).toEqual([
      { id: MESSAGE_ID, role: 'user', content: 'what is 2+2?' },
      { id: expect.any(String), role: 'assistant', content: 'Two plus two' },
    ]);
    expect(useChatStreamStore.getState()).toMatchObject({
      isStreaming: false,
      sessionId: EXISTING_ID,
    });
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('useChatStream — re-attaching, edge cases', () => {
  const replay = () =>
    server.use(
      http.get(
        API_ROUTE.replyStream,
        () =>
          new HttpResponse(frame('token', { token: '4' }, '1-1') + frame('end', {}, '1-2'), {
            headers: { 'Content-Type': 'text/event-stream' },
          }),
      ),
    );

  it('replaces a saved copy of the reply rather than showing it twice', async () => {
    // A reload that lands after the worker persisted the reply but before its stream ended.
    replay();
    useChatStreamStore.setState({
      sessionId: EXISTING_ID,
      history: [
        { id: MESSAGE_ID, role: 'user', content: 'what is 2+2?' },
        { id: STREAM_ID, role: 'assistant', content: '4' },
      ],
    });
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await act(async () => {
      await result.current.resumeStream({ sessionId: EXISTING_ID, streamId: STREAM_ID });
    });

    expect(history().map((m) => m.content)).toEqual(['what is 2+2?', '4']);
  });

  it('leaves a stream it is already following alone', async () => {
    let opened = 0;
    server.use(
      http.get(API_ROUTE.replyStream, () => {
        opened += 1;
        return new HttpResponse(frame('end', {}));
      }),
    );
    useChatStreamStore.setState({ isStreaming: true, streamId: STREAM_ID });
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await act(async () => {
      await result.current.resumeStream({ sessionId: EXISTING_ID, streamId: STREAM_ID });
    });

    expect(opened).toBe(0);
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
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    expect(useChatStreamStore.getState()).toMatchObject({
      isMessageAllowanceReached: true,
      isStreaming: false,
      error: null,
    });
  });

  it('returns the refused message to the composer instead of the history', async () => {
    server.use(mockApiError('post', API_ROUTE.sendMessage, 403, allowanceEnvelope));
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    expect(history()).toEqual([]);
    expect(useMessageStore.getState().message).toBe('what is 2+2?');
  });

  it('never creates a Session for a new chat once the allowance is spent', async () => {
    let created = false;
    server.use(
      getGetMessageAllowanceMockHandler({ metered: true, limit: 10, used: 10, remaining: 0 }),
      http.post(API_ROUTE.sessions, () => {
        created = true;
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    expect(created).toBe(false);
    expect(useChatStreamStore.getState()).toMatchObject({
      isMessageAllowanceReached: true,
      sessionId: undefined,
    });
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
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    expect(useChatStreamStore.getState().error).toBe('Forbidden.');
    expect(useChatStreamStore.getState().isMessageAllowanceReached).toBe(false);
  });

  it('clears the reached allowance once a later send goes through', async () => {
    useChatStreamStore.setState({ isMessageAllowanceReached: true });
    streamFrames(frame('token', { token: 'welcome back' }), frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

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
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

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
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    expect(opened).toBe(STREAM_ID);
  });

  it('starts a new chat by creating a Session titled after the message, then sends to it', async () => {
    let title: unknown;
    let sentTo: unknown;
    server.use(
      getCreateSessionMockHandler(async ({ request }) => {
        title = ((await request.json()) as { title: string }).title;
        return {
          id: NEW_SESSION_ID,
          title: 'x',
          createdAt: '2026-10-20T00:00:00.000Z',
          archived: false,
        };
      }),
      getSendMessageMockHandler(({ params }) => {
        sentTo = params['sessionId'];
        return { messageId: MESSAGE_ID, streamId: STREAM_ID };
      }),
    );
    streamFrames(frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    expect(title).toBe('what is 2+2?');
    expect(sentTo).toBe(NEW_SESSION_ID);
    expect(useChatStreamStore.getState().sessionId).toBe(NEW_SESSION_ID);
  });

  it('navigates to the new Session once the reply ends', async () => {
    streamFrames(frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    await sendMessage(result);

    expect(navigate).toHaveBeenCalledWith({
      to: '/s/$id',
      params: { id: NEW_SESSION_ID },
      replace: true,
    });
  });

  it('keeps isStreaming true through the post-stream navigation window', async () => {
    // Dropping it here would render a frame with no session and no stream: an empty-state flicker.
    streamFrames(frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

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
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

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
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF), { queryClient });

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
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF), { queryClient });

    await sendMessage(result);

    expect(isInvalidated(queryClient, getListSessionsInfiniteQueryKey())).toBe(true);
    expect(isInvalidated(queryClient, getGetSessionQueryKey(EXISTING_ID))).toBe(true);
    expect(isInvalidated(queryClient, getListMessagesQueryKey())).toBe(true);
  });

  it('refreshes the message allowance as soon as the send is accepted', async () => {
    streamFrames(frame('error', { success: false, error: 'Internal', message: 'boom' }));
    const queryClient = primedClient(getGetMessageAllowanceQueryKey());
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF), { queryClient });

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
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF), { queryClient });

    await sendMessage(result);

    expect(isInvalidated(queryClient, getGetMessageAllowanceQueryKey())).toBe(true);
  });

  it('leaves the message allowance alone when no message was counted', async () => {
    server.use(mockApiError('post', API_ROUTE.sendMessage, 500, {}));
    const queryClient = primedClient(getGetMessageAllowanceQueryKey());
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF), { queryClient });

    await sendMessage(result);

    expect(isInvalidated(queryClient, getGetMessageAllowanceQueryKey())).toBe(false);
  });

  it('leaves the messages alone when the reply fails', async () => {
    useChatStreamStore.setState({ sessionId: EXISTING_ID });
    streamFrames(frame('error', { success: false, error: 'Internal', message: 'boom' }));
    const queryClient = primedClient(getListMessagesQueryKey());
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF), { queryClient });

    await sendMessage(result);

    expect(isInvalidated(queryClient, getListMessagesQueryKey())).toBe(false);
  });
});

describe('useChatStream — lifecycle', () => {
  it('clearPostStream drops both streaming flags together', () => {
    useChatStreamStore.setState({ isStreaming: true, isPostStreamNavigation: true });
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    act(() => result.current.clearPostStream());

    expect(useChatStreamStore.getState()).toMatchObject({
      isStreaming: false,
      isPostStreamNavigation: false,
    });
  });

  it('abort stops the stream without recording an error', () => {
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

    act(() => result.current.abort());

    expect(useChatStreamStore.getState().isStreaming).toBe(false);
    expect(useChatStreamStore.getState().error).toBeNull();
  });

  it('aborting while the reply streams ends it without recording an error', async () => {
    useChatStreamStore.setState({ sessionId: EXISTING_ID });
    server.use(http.get(API_ROUTE.replyStream, () => new Promise<Response>(() => {})));
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

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
    const { result } = renderHookWithQueryClient(() => useChatStream(NO_BACKOFF));

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
