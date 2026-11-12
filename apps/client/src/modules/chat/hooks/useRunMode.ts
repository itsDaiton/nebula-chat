import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { isReplyInFlight } from '@/modules/chat/utils/replyState';

/** Whether the draft goes out as a Run. Only a Registered user's can, whatever the store holds. */
export const useRunMode = () => {
  const { isRegistered } = useAuth();
  const { isRunMode, toggleRunMode } = useMessageStore();
  const isRunInFlight = useChatStreamStore(
    ({ reply, history }) => isReplyInFlight(reply) && history.at(-1)?.run !== undefined,
  );
  const isOn = isRegistered && isRunMode;

  return {
    canRun: isRegistered,
    isRunMode: isOn,
    // The Session's Model applies to neither the Run being drafted nor the one in flight.
    isModelUnused: isOn || isRunInFlight,
    toggleRunMode,
  };
};
