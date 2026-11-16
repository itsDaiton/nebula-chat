import { UserBanNotice } from '@/modules/admin/components/UserBanNotice';
import { UserLastActive } from '@/modules/admin/components/UserLastActive';
import { UserSessionsList } from '@/modules/admin/components/UserSessionsList';
import { UserStatusBadge } from '@/modules/admin/components/UserStatusBadge';
import type { UserDetailProps } from '@/modules/admin/types/types';
import { formatUserDate } from '@/modules/admin/utils/formatUserDate';
import { USER_BADGE } from '@/modules/admin/utils/userBadge';
import { resources } from '@/resources';
import { Badge } from '@/shared/components/ui/badge';

const { detail: text } = resources.admin.users;

/** One User in the right panel: status, 2FA, the ban in force, counts and dates, and their Sessions. */
export const UserDetail = ({ user }: UserDetailProps) => {
  const facts: [string, React.ReactNode][] = [
    [text.created, formatUserDate(user.createdAt)],
    [text.lastActive, <UserLastActive key="lastActive" at={user.updatedAt} long />],
    [text.sessions, user.sessionsCount],
    [text.messagesSent, user.messagesSent],
    [
      text.pendingDeletion,
      user.pendingDeletionAt ? formatUserDate(user.pendingDeletionAt) : text.none,
    ],
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-1">
        <UserStatusBadge status={user.status} />
        <Badge variant="outline" className={USER_BADGE}>
          {user.twoFactorEnabled ? text.twoFactorOn : text.twoFactorOff}
        </Badge>
      </div>
      {user.ban && <UserBanNotice ban={user.ban} />}
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-[9px] text-[12.5px]">
        {facts.map(([term, value]) => (
          <div key={term} className="contents">
            <dt className="text-muted-foreground">{term}</dt>
            <dd className="text-right font-mono text-xs text-foreground-secondary tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <UserSessionsList userId={user.id} />
    </>
  );
};
