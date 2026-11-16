import { useQueryClient } from '@tanstack/react-query';
import { getGetSessionQueryKey, useGetSession } from '@/libs/api/generated/sessions/sessions';
import { getGetRunQueryKey } from '@/libs/api/generated/runs/runs';
import { useCancelReplyStream } from '@/libs/api/generated/streams/streams';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { isReplyInFlight } from '@/modules/chat/utils/replyState';

/** The open Session's Run waiting on its Clarifying question, and the cancel that ends the wait. */
export const useWaitingRun = () => {
  const sessionId = useChatStreamStore((chat) => chat.sessionId);
  const queryClient = useQueryClient();
  const { data } = useGetSession(sessionId ?? '', { query: { enabled: Boolean(sessionId) } });
  // A reply in flight is the answer's: the Session read still names the Run until it refetches.
  const isHidden = useChatStreamStore(
    ({ reply, cancelledRunId }) =>
      isReplyInFlight(reply) || cancelledRunId === data?.waitingRun?.id,
  );
  const { mutate, isPending } = useCancelReplyStream();
  const waitingRun = isHidden ? null : (data?.waitingRun ?? null);

  const cancel = () => {
    if (!waitingRun?.streamId || !sessionId) return;
    const { id: runId, streamId } = waitingRun;
    mutate(
      { streamId },
      {
        onSuccess: () => {
          useChatStreamStore.setState({ cancelledRunId: runId });
          void queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) });
          void queryClient.invalidateQueries({ queryKey: getGetRunQueryKey(runId) });
        },
      },
    );
  };

  return { waitingRun, cancel, isCancelling: isPending };
};
