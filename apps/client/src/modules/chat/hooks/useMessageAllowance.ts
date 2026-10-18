import { useGetMessageAllowance } from '@/libs/api/generated/chat/chat';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { isMessageAllowanceLow } from '@/modules/chat/utils/isMessageAllowanceLow';

/** A Metered user's Message allowance, read live from the server; `null` until it is known. */
export const useMessageAllowance = () => {
  const { isGuest, needsEmailVerification } = useAuth();
  const isMetered = isGuest || needsEmailVerification;
  const isMessageAllowanceReached = useChatStreamStore((state) => state.isMessageAllowanceReached);

  // Never served stale, and refetched on focus to catch a second tab or a verified email.
  // A failed read renders nothing rather than toasting: the stream's 403 stays the authority.
  const { data } = useGetMessageAllowance({
    query: {
      enabled: isMetered,
      staleTime: 0,
      refetchOnWindowFocus: true,
      meta: { inlineError: true },
    },
  });

  const allowance = isMetered && data?.metered ? data : null;

  return {
    allowance,
    isLow: allowance !== null && isMessageAllowanceLow(allowance.remaining, allowance.limit),
    // A refused send also counts, so the wall shows even when the count is stale.
    isSpent: isMessageAllowanceReached || allowance?.remaining === 0,
  };
};
