import { ArchiveRestoreIcon, BanIcon, ShieldIcon, ShieldOffIcon, Undo2Icon } from 'lucide-react';
import { BanDialog } from '@/modules/admin/components/BanDialog';
import { UserActionButton } from '@/modules/admin/components/UserActionButton';
import { UserConfirmDialog } from '@/modules/admin/components/UserConfirmDialog';
import { useUserActionRules } from '@/modules/admin/hooks/useUserActionRules';
import { useUserActions } from '@/modules/admin/hooks/useUserActions';
import { useUserActionStore } from '@/modules/admin/stores/useUserActionStore';
import type { UserActionsProps } from '@/modules/admin/types/types';
import { resources } from '@/resources';

const { actions: text } = resources.admin.users;

/** Grant or revoke Admin, ban or unban, and restore: each confirms first, and a refused one says why. */
export const UserActions = ({ user }: UserActionsProps) => {
  const { open, show, close } = useUserActionStore();
  const rules = useUserActionRules(user);
  const { grant, revoke, unban, restore } = useUserActions(user);
  const isAdmin = user.status === 'admin';
  const isBanned = user.ban !== null;
  const who = user.email;
  const roleMutation = isAdmin ? revoke : grant;

  return (
    <section aria-label={text.title} className="flex flex-col gap-2">
      <h3 className="text-[12.5px] font-medium text-muted-foreground">{text.title}</h3>
      <UserActionButton
        label={isAdmin ? text.revokeAdmin : text.grantAdmin}
        icon={isAdmin ? <ShieldOffIcon /> : <ShieldIcon />}
        disabledReason={rules.role.disabledReason}
        onClick={() => show('role')}
      />
      {isBanned ? (
        <UserActionButton label={text.unban} icon={<Undo2Icon />} onClick={() => show('unban')} />
      ) : (
        <UserActionButton
          label={text.ban}
          icon={<BanIcon />}
          disabledReason={rules.ban.disabledReason}
          onClick={() => show('ban')}
        />
      )}
      <UserActionButton
        label={text.restore}
        icon={<ArchiveRestoreIcon />}
        disabledReason={rules.restore.disabledReason}
        onClick={() => show('restore')}
      />
      <UserConfirmDialog
        open={open === 'role'}
        onOpenChange={(next) => !next && close()}
        title={isAdmin ? text.revokeTitle(who) : text.grantTitle(who)}
        description={isAdmin ? text.revokeBody : text.grantBody}
        confirmLabel={isAdmin ? text.revokeAdmin : text.grantAdmin}
        pending={roleMutation.isPending}
        onConfirm={() =>
          roleMutation.mutate(
            { id: user.id, data: { role: isAdmin ? 'user' : 'admin' } },
            { onSuccess: close },
          )
        }
      />
      <UserConfirmDialog
        open={open === 'unban'}
        onOpenChange={(next) => !next && close()}
        title={text.unbanTitle(who)}
        description={text.unbanBody}
        confirmLabel={text.unban}
        pending={unban.isPending}
        onConfirm={() => unban.mutate({ id: user.id }, { onSuccess: close })}
      />
      <UserConfirmDialog
        open={open === 'restore'}
        onOpenChange={(next) => !next && close()}
        title={text.restoreTitle(who)}
        description={text.restoreBody}
        confirmLabel={text.restore}
        pending={restore.isPending}
        onConfirm={() => restore.mutate({ id: user.id }, { onSuccess: close })}
      />
      <BanDialog user={user} open={open === 'ban'} onOpenChange={(next) => !next && close()} />
    </section>
  );
};
