import { Link } from '@tanstack/react-router';
import { CalendarIcon, Loader2Icon } from 'lucide-react';
import { AuthFormAlert } from '@/modules/auth/components/AuthFormAlert';
import { AuthHeading } from '@/modules/auth/components/AuthHeading';
import { OutcomeIcon } from '@/modules/auth/components/OutcomeIcon';
import { useRestoreAccount } from '@/modules/auth/hooks/useRestoreAccount';
import type { PendingDeletionPromptProps } from '@/modules/auth/types/types';
import { formatAuthDate } from '@/modules/auth/utils/formatAuthDate';
import { resources } from '@/resources';
import { Button, buttonVariants } from '@/shared/components/ui/button';

const { pendingDeletion } = resources.auth;

/** A sign-in found the account in Pending deletion: restore it, or leave it to be purged. */
export const PendingDeletionPrompt = ({ purgeDate, restoreToken }: PendingDeletionPromptProps) => {
  const { mutate: restore, isPending, error } = useRestoreAccount();

  return (
    <div className="flex flex-col">
      <OutcomeIcon icon={CalendarIcon} className="text-warning" />
      <AuthHeading
        title={pendingDeletion.title}
        description={
          <>
            {pendingDeletion.scheduledOn}
            <b className="font-medium text-foreground">{formatAuthDate(purgeDate)}</b>
            {pendingDeletion.restoreOrSignOut}
          </>
        }
      />
      <div className="mt-[22px] flex flex-col gap-1.5">
        <AuthFormAlert message={error?.message} />
        <Button
          size="lg"
          className="w-full"
          disabled={isPending}
          aria-busy={isPending}
          onClick={() => restore(restoreToken)}
        >
          {isPending && <Loader2Icon className="animate-spin" />}
          {pendingDeletion.restore}
        </Button>
        {/* No session was made, so signing out only leaves: the browser keeps its Guest session. */}
        <Link
          to="/"
          className={buttonVariants({ variant: 'ghost', size: 'lg', className: 'w-full' })}
        >
          {pendingDeletion.signOut}
        </Link>
      </div>
    </div>
  );
};
