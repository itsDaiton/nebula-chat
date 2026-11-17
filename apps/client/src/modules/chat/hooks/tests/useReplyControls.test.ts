import { act, renderHook } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useReplyControls } from '@/modules/chat/hooks/useReplyControls';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import type { ChatMessage } from '@/modules/chat/types/types';
import { IDLE_REPLY } from '@/modules/chat/utils/replyState';
import { API_ROUTE, mockApiError } from '@/test/api';
import { resources } from '@/resources';
import { server } from '@/test/msw';

const navigate = vi.fn();

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));

const STREAM_ID = 'st1';
const CANCEL_ROUTE = `${API_ROUTE.replyStream}/cancel`;

const reply = () => useChatStreamStore.getState().reply;
const render = () => renderHook(() => useReplyControls()).result;

/** Serves the cancel endpoint, reporting the stream it was asked to cancel. */
const serveCancel = () => {
  const cancelled = vi.fn();
  server.use(
    http.post(CANCEL_ROUTE, ({ params }) => {
      cancelled(params['streamId']);
      return new HttpResponse(null, { status: 202 });
    }),
  );
  return cancelled;
};

const user: ChatMessage = { id: 'u1', role: 'user', content: 'what is 2+2?' };
const assistant: ChatMessage = { id: 'a1', role: 'assistant', content: '2+' };

beforeEach(() => {
  vi.clearAllMocks();
  useChatStreamStore.setState({ reply: IDLE_REPLY, streamId: null, history: [] });
  useMessageStore.setState({ message: '' });
});

describe('useReplyControls — settle', () => {
  it('rests the reply at its end', () => {
    const result = render();

    act(() => result.current.settle({ status: 'stopped' }));

    expect(reply()).toEqual({ status: 'stopped' });
    expect(navigate).not.toHaveBeenCalled();
  });

  it("holds a new chat's end while it moves to its Session, until clearPostStream", () => {
    const result = render();

    act(() => result.current.settle(IDLE_REPLY, 'new-session'));

    expect(reply()).toEqual({ status: 'navigating', end: IDLE_REPLY });
    expect(navigate).toHaveBeenCalledWith({
      to: '/s/$id',
      params: { id: 'new-session' },
      replace: true,
    });

    act(() => result.current.clearPostStream());

    expect(reply()).toEqual(IDLE_REPLY);
  });

  it('leaves a reply that is not navigating alone on clearPostStream', () => {
    useChatStreamStore.setState({ reply: { status: 'streaming' } });
    const result = render();

    act(() => result.current.clearPostStream());

    expect(reply()).toEqual({ status: 'streaming' });
  });
});

describe('useReplyControls — abort', () => {
  it('aborts the reply begun last and idles it', () => {
    useChatStreamStore.setState({ reply: { status: 'streaming' } });
    const result = render();
    const controller = result.current.begin();

    act(() => result.current.abort());

    expect(controller.signal.aborted).toBe(true);
    expect(reply()).toEqual(IDLE_REPLY);
  });

  it('keeps a newer reply when an older one is released', () => {
    const result = render();
    const older = result.current.begin();
    const newer = result.current.begin();

    result.current.release(older);
    act(() => result.current.abort());

    expect(newer.signal.aborted).toBe(true);
    expect(older.signal.aborted).toBe(false);
  });
});

describe('useReplyControls — stop', () => {
  it('defers the cancel while the send has not named the stream', async () => {
    useChatStreamStore.setState({ reply: { status: 'sending', stopRequested: false } });
    const cancelled = serveCancel();
    const result = render();

    await act(() => result.current.stop());

    expect(reply()).toEqual({ status: 'sending', stopRequested: true });
    expect(cancelled).not.toHaveBeenCalled();
  });

  it('cancels a streaming reply', async () => {
    useChatStreamStore.setState({ reply: { status: 'streaming' }, streamId: STREAM_ID });
    const cancelled = serveCancel();
    const result = render();

    await act(() => result.current.stop());

    expect(cancelled).toHaveBeenCalledWith(STREAM_ID);
    expect(reply()).toEqual({ status: 'streaming' });
  });

  it('stops reading when the cancel never reaches the server', async () => {
    useChatStreamStore.setState({ reply: { status: 'streaming' }, streamId: STREAM_ID });
    server.use(mockApiError('post', CANCEL_ROUTE, 503));
    const result = render();
    const controller = result.current.begin();

    await act(() => result.current.stop());

    expect(controller.signal.aborted).toBe(true);
    expect(reply()).toEqual(IDLE_REPLY);
  });

  it('does nothing once the reply is over', async () => {
    const cancelled = serveCancel();
    const result = render();

    await act(() => result.current.stop());

    expect(cancelled).not.toHaveBeenCalled();
    expect(reply()).toEqual(IDLE_REPLY);
  });
});

describe('useReplyControls — failures', () => {
  it('shows the error in the reply and rests it as failed', () => {
    useChatStreamStore.setState({ history: [user, assistant], reply: { status: 'streaming' } });
    const result = render();

    act(() => result.current.settleFailure(new Error('Provider down')));

    expect(useChatStreamStore.getState().history.at(-1)?.content).toBe('Provider down');
    expect(reply()).toEqual({ status: 'failed', error: 'Provider down' });
  });

  it("moves a new chat's failed reply to its Session, with the generic message for an unknown error", () => {
    useChatStreamStore.setState({ history: [user, assistant] });
    const result = render();

    act(() => result.current.settleFailure('boom', 'new-session'));

    expect(reply()).toEqual({
      status: 'navigating',
      end: { status: 'failed', error: resources.chat.streamError },
    });
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ params: { id: 'new-session' } }),
    );
  });

  it('hands a refused message back to the composer', () => {
    useChatStreamStore.setState({
      history: [user, assistant],
      reply: { status: 'sending', stopRequested: false },
    });
    const result = render();

    act(() => result.current.returnToComposer([user], { isMessageAllowanceReached: true }));

    expect(useChatStreamStore.getState()).toMatchObject({
      history: [],
      reply: IDLE_REPLY,
      isMessageAllowanceReached: true,
    });
    expect(useMessageStore.getState().message).toBe('what is 2+2?');
  });
});
