import { describe, expect, it, vi } from 'vitest';
import type { FollowStreamOptions, SseFrame } from '@/modules/chat/types/types';
import { followStream } from '@/modules/chat/streaming/followStream';
import { resources } from '@/resources';
import { sseFrame } from '@/test/chat';

type Open = NonNullable<FollowStreamOptions['open']>;

// A reply stream body of `chunks`; `drop` errors it once they are read, as a cut connection does
// (an error before then would discard the chunks still queued).
const sse = (chunks: string[], { drop = false } = {}) => {
  const queue = [...chunks];
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      pull(controller) {
        const chunk = queue.shift();
        if (chunk !== undefined) controller.enqueue(encoder.encode(chunk));
        else if (drop) controller.error(new Error('connection reset'));
        else controller.close();
      },
    }),
    { headers: { 'Content-Type': 'text/event-stream' } },
  );
};

const refusal = (status: number, message: string) =>
  Response.json({ success: false, error: 'BadRequest', message }, { status });

/** Answers each open with the next response in turn. */
const opening = (...responses: (Response | null)[]): ReturnType<typeof vi.fn<Open>> => {
  const open = vi.fn<Open>();
  for (const response of responses) open.mockResolvedValueOnce(response);
  return open;
};

const follow = (open: Open, overrides: Partial<FollowStreamOptions> = {}) => {
  const frames: SseFrame[] = [];
  const onExpired = vi.fn(async () => undefined);
  const result = followStream({
    streamId: 'st1',
    signal: new AbortController().signal,
    reconnectDelaysMs: [0, 0],
    open,
    onEvent: (frame) => {
      frames.push(frame);
      return frame.event === 'end' ? { status: 'idle' } : null;
    },
    onExpired,
    ...overrides,
  });
  return { result, frames, onExpired };
};

describe('followStream', () => {
  it('applies each event and returns the end the stream reached', async () => {
    const open = opening(
      sse([sseFrame('token', { token: 'hi' }, '1-0'), sseFrame('end', {}, '1-1')]),
    );
    const { result, frames } = follow(open);

    await expect(result).resolves.toEqual({ status: 'idle' });
    expect(frames.map(({ event }) => event)).toEqual(['token', 'end']);
    expect(open).toHaveBeenCalledWith('st1', undefined, expect.any(AbortSignal));
  });

  it('reconnects after a drop from the last event it saw, skipping replayed entries', async () => {
    const open = opening(
      sse([sseFrame('token', { token: 'a' }, '5-0'), sseFrame('token', { token: 'b' }, '5-1')], {
        drop: true,
      }),
      sse([
        sseFrame('token', { token: 'b' }, '5-1'),
        sseFrame('token', { token: 'c' }, '6-0'),
        sseFrame('end', {}, '6-1'),
      ]),
    );
    const { result, frames } = follow(open);

    await expect(result).resolves.toEqual({ status: 'idle' });
    expect(frames.map(({ data }) => data)).toEqual([
      '{"token":"a"}',
      '{"token":"b"}',
      '{"token":"c"}',
      '{}',
    ]);
    expect(open).toHaveBeenLastCalledWith('st1', '5-1', expect.any(AbortSignal));
  });

  it('reconnects when the body closes before the end, and when the network fails', async () => {
    const open = opening(sse([]), null, sse([sseFrame('end', {}, '1-0')]));

    await expect(follow(open).result).resolves.toEqual({ status: 'idle' });
    expect(open).toHaveBeenCalledTimes(3);
  });

  it('resets the retries once a reconnect delivers an event', async () => {
    const open = opening(
      null,
      null,
      sse([sseFrame('token', { token: 'a' }, '1-0')], { drop: true }),
      null,
      sse([sseFrame('end', {}, '1-1')]),
    );

    await expect(follow(open).result).resolves.toEqual({ status: 'idle' });
  });

  it('retries a 5xx refusal', async () => {
    const open = opening(refusal(503, 'Restarting'), sse([sseFrame('end', {}, '1-0')]));

    await expect(follow(open).result).resolves.toEqual({ status: 'idle' });
  });

  it('shows the saved reply instead of an expired stream', async () => {
    const { result, onExpired, frames } = follow(opening(new Response(null, { status: 404 })));

    await expect(result).resolves.toEqual({ status: 'idle' });
    expect(onExpired).toHaveBeenCalledOnce();
    expect(frames).toEqual([]);
  });

  it('throws a 4xx refusal at once, with its message', async () => {
    const open = opening(refusal(403, 'Not your stream'));

    await expect(follow(open).result).rejects.toThrow('Not your stream');
    expect(open).toHaveBeenCalledOnce();
  });

  it('gives up once the reconnects run out', async () => {
    const open = opening(null, null, null);

    await expect(follow(open).result).rejects.toThrow(resources.chat.streamError);
    expect(open).toHaveBeenCalledTimes(3);
  });

  it('throws a 5xx refusal once the reconnects run out', async () => {
    const open = opening(null, null, refusal(500, 'Still down'));

    await expect(follow(open).result).rejects.toThrow('Still down');
  });

  it('returns null once aborted, without reconnecting', async () => {
    const controller = new AbortController();
    const open = vi.fn<Open>(async () => {
      controller.abort();
      return null;
    });

    await expect(
      follow(open, { signal: controller.signal, reconnectDelaysMs: [60_000] }).result,
    ).resolves.toBeNull();
    expect(open).toHaveBeenCalledOnce();
  });

  it('stops waiting out a backoff when aborted', async () => {
    const controller = new AbortController();
    const open = opening(null);
    const { result } = follow(open, { signal: controller.signal, reconnectDelaysMs: [60_000] });

    await vi.waitFor(() => expect(open).toHaveBeenCalledOnce());
    controller.abort();

    await expect(result).resolves.toBeNull();
  });
});
