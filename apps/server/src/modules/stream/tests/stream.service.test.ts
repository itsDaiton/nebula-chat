import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@server/redis', async () => {
  const { replyStreams: fake } = await import('@server/test/memoryReplyStreams.js');
  return {
    findStreamOwner: fake.findStreamOwner,
    openReplyStream: fake.openReplyStream,
  };
});

import { streamService } from '@server/modules/stream/stream.service';
import { captureLogger } from '@nebula-chat/otel/testing';
import { replyStreams } from '@server/test/memoryReplyStreams';

const STREAM_ID = '44444444-4444-4444-8444-444444444444';

beforeEach(() => {
  replyStreams.reset();
});

describe('streamService.relay', () => {
  it('stops waiting and drops its connection the moment the client goes away, logging nothing', async () => {
    const { logger, lines } = captureLogger();
    const frames: string[] = [];
    const disconnected = new AbortController();
    replyStreams.append(STREAM_ID, { type: 'token', token: 'a' });

    const relaying = streamService.relay(
      STREAM_ID,
      (chunk) => frames.push(chunk),
      disconnected.signal,
      logger,
    );
    await vi.waitFor(() => expect(replyStreams.reads).toHaveLength(2));
    disconnected.abort();

    await expect(relaying).resolves.toBeUndefined();
    expect(replyStreams.state.closedReaders).toBe(1);
    expect(frames).toHaveLength(1);
    expect(lines).toEqual([]);
  });
});
