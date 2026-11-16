import type { QueryClient } from '@tanstack/react-query';
import { getListMessagesQueryOptions } from '@/libs/api/generated/messages/messages';
import type { ChatStreamState } from '@/modules/chat/types/types';
import { withReply } from '@/modules/chat/streaming/applyStreamEvent';
import { mapSessionMessages } from '@/modules/chat/utils/mapSessionMessages';

const fetchSavedMessages = async (queryClient: QueryClient, sessionId: string) =>
  mapSessionMessages(
    await queryClient.fetchQuery({ ...getListMessagesQueryOptions({ sessionId }), staleTime: 0 }),
  );

// An expired stream leaves only the persisted reply, so the chat shows the Session's saved Messages.
export const showSavedReply = async (
  queryClient: QueryClient,
  sessionId: string,
  setHistory: ChatStreamState['setHistory'],
) => setHistory(await fetchSavedMessages(queryClient, sessionId));

// The stream carries only the token count; the saved reply knows its Model and cost, so the meta row
// takes them now rather than after a reload. `isCurrent` turns false once another Session is on screen.
export const showSavedReplyMeta = async (
  queryClient: QueryClient,
  sessionId: string,
  setHistory: ChatStreamState['setHistory'],
  isCurrent: () => boolean,
) => {
  const saved = await fetchSavedMessages(queryClient, sessionId);
  const reply = saved.findLast(({ role }) => role === 'assistant');
  if (!reply || !isCurrent()) return;
  const { model, estimatedCostUsd, runId, tokenCount } = reply;
  setHistory((prev) =>
    withReply(prev, (last) => ({
      ...last,
      model,
      estimatedCostUsd,
      runId,
      tokenCount: tokenCount ?? last.tokenCount,
    })),
  );
};
