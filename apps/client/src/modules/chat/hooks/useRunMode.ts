import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { useWaitingRun } from '@/modules/chat/hooks/useWaitingRun';
import { isReplyInFlight } from '@/modules/chat/utils/replyState';

/** Whether the draft goes out as a Run. Only a Registered user's can, whatever the store holds. */
export const useRunMode = () => {
  const { isRegistered } = useAuth();
  const { isRunMode, toggleRunMode } = useMessageStore();
  const isRunInFlight = useChatStreamStore(
    ({ reply, history }) => isReplyInFlight(reply) && history.at(-1)?.run !== undefined,
  );
  // A waiting Run takes the next message as its answer, so there is no mode to pick.
  const isAnswering = useWaitingRun().waitingRun !== null;
  const isOn = isRegistered && isRunMode && !isAnswering;

  return {
    canRun: isRegistered && !isAnswering,
    isAnswering,
    isRunMode: isOn,
    // The Session's Model applies to no Run: the one being drafted, in flight or waiting.
    isModelUnused: isOn || isRunInFlight || isAnswering,
    toggleRunMode,
  };
};
