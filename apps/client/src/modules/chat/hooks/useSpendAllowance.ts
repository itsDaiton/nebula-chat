import { useGetSpendAllowance } from '@/libs/api/generated/chat/chat';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { isMessageAllowanceLow } from '@/modules/chat/utils/isMessageAllowanceLow';

/** A verified Registered user's monthly Spend allowance, read live; `null` for everyone else or until known. */
export const useSpendAllowance = () => {
  const { isRegistered, needsEmailVerification } = useAuth();
  const isVerified = isRegistered && !needsEmailVerification;
  const isSpendAllowanceReached = useChatStreamStore((state) => state.isSpendAllowanceReached);

  // The Message allowance is empty for a verified user, so this is its own read, never served stale.
  const { data } = useGetSpendAllowance({
    query: {
      enabled: isVerified,
      staleTime: 0,
      refetchOnWindowFocus: true,
      meta: { inlineError: true },
    },
  });

  const allowance = isVerified && data?.capped ? data : null;

  return {
    allowance,
    isLow: allowance !== null && isMessageAllowanceLow(allowance.remaining, allowance.limit),
    // A refused send also counts, so the wall shows even when the sum is stale.
    isSpent: isSpendAllowanceReached || allowance?.remaining === 0,
  };
};
