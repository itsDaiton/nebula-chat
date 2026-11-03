import { Link } from '@tanstack/react-router';
import { BanIcon } from 'lucide-react';
import { AuthHeading } from '@/modules/auth/components/AuthHeading';
import { OutcomeIcon } from '@/modules/auth/components/OutcomeIcon';
import type { BannedNoticeProps } from '@/modules/auth/types/types';
import { formatAuthDate } from '@/modules/auth/utils/formatAuthDate';
import { resources } from '@/resources';
import { buttonVariants } from '@/shared/components/ui/button';

const { banned } = resources.auth;

/** A banned User's sign-in: why, and until when. The browser keeps its Guest session. */
export const BannedNotice = ({ reason, until }: BannedNoticeProps) => (
  <div className="flex flex-col">
    <OutcomeIcon icon={BanIcon} className="text-destructive" />
    <AuthHeading
      title={banned.title}
      description={
        until ? (
          <>
            {banned.bannedUntil}
            <b className="font-medium text-foreground">{formatAuthDate(until)}</b>
            {banned.bannedUntilEnd}
          </>
        ) : (
          banned.bannedPermanently
        )
      }
    />
    {reason && (
      <div className="mt-3.5 rounded-lg border border-border bg-raised px-3 py-2.5 text-[13px]">
        <p className="text-muted-foreground">{banned.reason}</p>
        <p>{reason}</p>
      </div>
    )}
    <Link
      to="/"
      className={buttonVariants({ variant: 'outline', size: 'lg', className: 'mt-4 w-full' })}
    >
      {banned.continueAsGuest}
    </Link>
  </div>
);
