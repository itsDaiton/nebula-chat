import { Link } from '@tanstack/react-router';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useMessageAllowance } from '@/modules/chat/hooks/useMessageAllowance';
import { resources } from '@/resources';
import { allowanceLinkClass as LINK } from '@/modules/chat/utils/allowanceLinkClass';

/** Shown once a Guest's message allowance is spent (or a send was refused at it); registering lifts it. */
export const MessageAllowancePrompt = () => {
  const { isGuest } = useAuth();
  const { isSpent } = useMessageAllowance();

  if (!isGuest || !isSpent) return null;

  const { title, action, description } = resources.chat.messageAllowance;

  return (
    <p role="alert" className="mb-3 px-1.5 text-center text-[12.5px] text-muted-foreground">
      <span className="font-medium text-foreground">{title}</span>{' '}
      <Link to="/auth" className={LINK}>
        {action}
      </Link>{' '}
      {description}
    </p>
  );
};
