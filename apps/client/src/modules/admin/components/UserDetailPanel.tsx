import { getRouteApi, useSearch } from '@tanstack/react-router';
import { XIcon } from 'lucide-react';
import { useGetUser } from '@/libs/api/generated/admin/admin';
import { UserDetail } from '@/modules/admin/components/UserDetail';
import type { UserDetailPanelProps } from '@/modules/admin/types/types';
import { resources } from '@/resources';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { IconButton } from '@/shared/components/ui/icon-button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { initialsOf } from '@/shared/utils/initialsOf';

const route = getRouteApi('/_app/admin/users');
const { detail: text } = resources.admin.users;

/** The Users page's right panel: the User whose id is `selected` in the URL, so a link opens the same detail. */
export const UserDetailPanel = ({ onClose }: UserDetailPanelProps) => {
  // Not strict: the panel can outlive its route for a render while the dashboard navigates away.
  const { selected } = useSearch({ strict: false });
  const navigate = route.useNavigate();
  const {
    data: user,
    isPending,
    isError,
  } = useGetUser(selected ?? '', {
    query: { enabled: Boolean(selected), meta: { inlineError: true } },
  });

  const close = () => {
    void navigate({ search: (previous) => ({ ...previous, selected: undefined }), replace: true });
    onClose();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-3.5">
      <div className="flex items-center gap-3">
        {user && (
          <>
            <Avatar className="size-11">
              <AvatarFallback className="text-[15px]">{initialsOf(user.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold">{user.name}</h2>
              <p className="truncate font-mono text-[11px] text-faint">{user.email}</p>
            </div>
          </>
        )}
        <IconButton
          variant="ghost"
          size="icon"
          label={resources.admin.detail.close}
          className="ml-auto"
          onClick={close}
        >
          <XIcon />
        </IconButton>
      </div>
      {!selected && <p className="text-[12.5px] text-muted-foreground">{text.empty}</p>}
      {selected && isPending && (
        <output aria-label={text.loading} className="flex flex-col gap-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-24" />
        </output>
      )}
      {selected && isError && (
        <p role="alert" className="text-[12.5px] text-destructive">
          {text.loadFailed}
        </p>
      )}
      {user && <UserDetail user={user} />}
    </div>
  );
};
