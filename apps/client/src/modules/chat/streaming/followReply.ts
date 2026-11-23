import type { QueryClient } from '@tanstack/react-query';
import type { FollowReplyOptions, ReplyEnd, ReplySink, SseFrame } from '@/modules/chat/types/types';
import { applyStreamEvent } from '@/modules/chat/streaming/applyStreamEvent';
import { offerSettingsForInvalidKey } from '@/modules/chat/streaming/invalidOwnKey';
import { followStream } from '@/modules/chat/streaming/followStream';
import {
  invalidateCompletedStream,
  invalidateRun,
  invalidateRunThrottled,
} from '@/modules/chat/streaming/invalidations';
import { showSavedReply, showSavedReplyMeta } from '@/modules/chat/streaming/savedReply';

const applyFrame = (
  queryClient: QueryClient,
  sink: ReplySink,
  frame: SseFrame,
): ReplyEnd | null => {
  offerSettingsForInvalidKey(frame);
  const current = sink.getHistory();
  const result = applyStreamEvent(current, frame);
  if (result.usage) sink.setUsage(result.usage);
  // A frame that changes nothing writes nothing, so the store's subscribers stay quiet.
  if (result.history !== current) sink.setHistory(result.history);
  if (result.staleRunId) {
    const refresh = frame.event === 'run-finished' ? invalidateRun : invalidateRunThrottled;
    refresh(queryClient, result.staleRunId);
  }
  return result.end ?? null;
};

const completeReply = (queryClient: QueryClient, sessionId: string, sink: ReplySink) => {
  invalidateCompletedStream(queryClient, sessionId);
  // A failed read leaves the meta row as the stream left it; the invalidation above reports the failure.
  void showSavedReplyMeta(queryClient, sessionId, sink.setHistory, () =>
    sink.isCurrent(sessionId),
  ).catch(() => undefined);
};

// Follows a reply into the trailing assistant Message; null once aborted, and throws once retries run out.
export const followReply = async (
  queryClient: QueryClient,
  { streamId, sessionId, signal, reconnectDelaysMs, sink }: FollowReplyOptions,
): Promise<ReplyEnd | null> => {
  const end = await followStream({
    streamId,
    signal,
    reconnectDelaysMs,
    onEvent: (frame) => applyFrame(queryClient, sink, frame),
    onExpired: () => showSavedReply(queryClient, sessionId, sink.setHistory),
  });
  if (end && end.status !== 'failed') completeReply(queryClient, sessionId, sink);
  return end;
};
