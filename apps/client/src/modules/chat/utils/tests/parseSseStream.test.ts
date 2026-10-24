import { describe, expect, it } from 'vitest';
import { parseSseStream } from '@/modules/chat/utils/parseSseStream';

const bodyOf = (...chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });

const collect = async (...chunks: string[]) => {
  const frames = [];
  for await (const frame of parseSseStream(bodyOf(...chunks))) frames.push(frame);
  return frames;
};

describe('parseSseStream', () => {
  it('yields each known event with its data, in order', async () => {
    await expect(
      collect('event: token\ndata: {"token":"a"}\n\n', 'event: end\ndata: {}\n\n'),
    ).resolves.toEqual([
      { event: 'token', data: '{"token":"a"}' },
      { event: 'end', data: '{}' },
    ]);
  });

  it('buffers an event split across chunks until it is complete', async () => {
    await expect(collect('event: tok', 'en\ndata: {"tok', 'en":"a"}\n', '\n')).resolves.toEqual([
      { event: 'token', data: '{"token":"a"}' },
    ]);
  });

  it('ignores comments and events it does not know', async () => {
    await expect(
      collect(
        ': keep-alive\n\n',
        'event: step-started\ndata: {}\n\n',
        'event: usage\ndata: {"totalTokens":3}\n\n',
      ),
    ).resolves.toEqual([{ event: 'usage', data: '{"totalTokens":3}' }]);
  });

  it('carries each event’s id, the stream entry a reconnect resumes after', async () => {
    await expect(collect('id: 1-1\nevent: token\ndata: {"token":"a"}\n\n')).resolves.toEqual([
      { event: 'token', data: '{"token":"a"}', id: '1-1' },
    ]);
  });

  it('drops a trailing event the body never terminated', async () => {
    await expect(collect('event: token\ndata: {"token":"a"}')).resolves.toEqual([]);
  });
});
