import { Link } from '@tanstack/react-router';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useMessageAllowance } from '@/modules/chat/hooks/useMessageAllowance';
import { resources } from '@/resources';
import { cn } from '@/shared/utils/cn';

const { messageAllowance } = resources.chat;

/** A Metered user's messages left, under the composer; at zero the wall prompt takes its place. */
export const MessageAllowanceCounter = () => {
  const { isGuest } = useAuth();
  const { allowance, isLow, isSpent } = useMessageAllowance();

  if (!allowance || isSpent) return null;

  return (
    <div role="status" className="flex items-center justify-between px-1.5 pt-2 text-[11.5px]">
      <span
        className={cn(
          'flex items-center gap-1.5 font-mono',
          isLow ? 'text-warning' : 'text-muted-foreground',
        )}
      >
        {isLow && <span aria-hidden className="size-1.5 rounded-full bg-warning" />}
        {messageAllowance.remaining(allowance.remaining, allowance.limit)}
      </span>
      {/* An unverified user's resend action is already in the verify-email reminder above. */}
      {isLow && isGuest && (
        <span className="text-faint">
          <Link
            to="/auth"
            className="text-foreground-secondary underline decoration-border-strong underline-offset-3"
          >
            {messageAllowance.counterAction}
          </Link>{' '}
          {messageAllowance.toKeepChatting}
        </span>
      )}
    </div>
  );
};
