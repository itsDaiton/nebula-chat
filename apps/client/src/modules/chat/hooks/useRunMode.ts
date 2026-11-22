import { useGetSession } from '@/libs/api/generated/sessions/sessions';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { useWaitingRun } from '@/modules/chat/hooks/useWaitingRun';

/** The Session's Reply mode once it has one; on a new chat, the toggle. A Guest's is always Direct. */
export const useRunMode = () => {
  const { isRegistered } = useAuth();
  const { isRunMode: isToggledOn, toggleRunMode } = useMessageStore();
  const sessionId = useChatStreamStore((chat) => chat.sessionId);
  const { data: session } = useGetSession(sessionId ?? '', {
    query: { enabled: Boolean(sessionId) },
  });
  // A waiting Run takes the next message as its answer, so there is no mode to pick.
  const isAnswering = useWaitingRun().waitingRun !== null;
  // Between the first send and the Session read, the toggle that chose the mode still holds it.
  const isRun = session ? session.replyMode === 'run' : isToggledOn;
  const isLocked = Boolean(sessionId);

  return {
    canRun: isRegistered && !isLocked && !isAnswering,
    isRegistered,
    isLocked,
    isAnswering,
    isRunMode: isRegistered && isRun,
    toggleRunMode,
  };
};
