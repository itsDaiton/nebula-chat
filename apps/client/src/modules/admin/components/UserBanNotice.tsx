import { BanIcon } from 'lucide-react';
import type { UserBanNoticeProps } from '@/modules/admin/types/types';
import { formatUserDate } from '@/modules/admin/utils/formatUserDate';
import { resources } from '@/resources';

const { detail: text } = resources.admin.users;

/** The ban in force: when it ends, or that it never does, and the reason the User is shown at sign-in. */
export const UserBanNotice = ({ ban }: UserBanNoticeProps) => (
  <div className="flex gap-2.5 rounded-[10px] border border-destructive/25 bg-destructive/6 px-3 py-2.5 text-[12.5px] text-foreground-secondary">
    <BanIcon className="mt-0.5 size-3.5 shrink-0 text-destructive" />
    <div className="min-w-0">
      {ban.expiresAt ? (
        <p>
          {text.bannedUntil}
          <span className="font-medium text-foreground">{formatUserDate(ban.expiresAt)}</span>
        </p>
      ) : (
        <p>{text.bannedPermanently}</p>
      )}
      {ban.reason && <p className="break-words text-muted-foreground">{ban.reason}</p>}
      {ban.note && (
        <p className="break-words text-muted-foreground">
          <span className="font-medium text-foreground">{text.banNote}</span> {ban.note}
        </p>
      )}
    </div>
  </div>
);
