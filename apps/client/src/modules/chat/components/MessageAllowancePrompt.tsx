import { Link } from '@tanstack/react-router';
import { InfoIcon } from 'lucide-react';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useMessageAllowance } from '@/modules/chat/hooks/useMessageAllowance';
import { resources } from '@/resources';
import { buttonVariants } from '@/shared/components/ui/button';
import { cn } from '@/shared/utils/cn';

/** Shown once a Guest's message allowance is spent (or a send was refused at it); registering lifts it. */
export const MessageAllowancePrompt = () => {
  const { isGuest } = useAuth();
  const { isSpent } = useMessageAllowance();

  if (!isGuest || !isSpent) return null;

  return (
    <div
      role="alert"
      className="mb-3 flex items-center gap-2.5 rounded-[10px] border border-border bg-raised px-3.5 py-3 text-[12.5px] text-foreground-secondary"
    >
      <InfoIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{resources.chat.messageAllowance.title}</p>
        <p>{resources.chat.messageAllowance.description}</p>
      </div>
      <Link to="/auth" className={cn(buttonVariants({ size: 'sm' }), 'shrink-0 rounded-full')}>
        {resources.chat.messageAllowance.action}
      </Link>
    </div>
  );
};
