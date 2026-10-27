import { Link, useNavigate } from '@tanstack/react-router';
import { ChevronsUpDownIcon, LogOutIcon, SettingsIcon, UserIcon } from 'lucide-react';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useSignOut } from '@/modules/auth/hooks/useSignOut';
import { resources } from '@/resources';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { buttonVariants } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { cn } from '@/shared/utils/cn';
import { initialsOf } from '@/shared/utils/initialsOf';

/** The left panel's account area: a Guest's Sign in and Sign up, or a Registered user's name, status and menu. */
export const AccountFooter = () => {
  const { user, isGuest, isRegistered, isAdmin, hasTwoFactor } = useAuth();
  const { mutate: signOut, isPending } = useSignOut();
  const navigate = useNavigate();

  if (isGuest) {
    return (
      <div className="flex shrink-0 flex-col gap-3 border-t border-border px-3 pt-2.5 pb-3">
        <div className="flex items-center gap-2.5">
          <Avatar>
            <AvatarFallback>
              <UserIcon className="size-4" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 leading-tight">
            <p className="text-[13px] font-medium">{resources.account.guest}</p>
            <p className="truncate text-[11.5px] text-muted-foreground">
              {resources.account.guestHint}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link to="/auth" className={cn(buttonVariants({ variant: 'outline' }), 'h-9')}>
            {resources.auth.actions.signIn}
          </Link>
          <Link to="/auth" className={cn(buttonVariants({ variant: 'secondary' }), 'h-9')}>
            {resources.auth.actions.signUp}
          </Link>
        </div>
      </div>
    );
  }

  if (!isRegistered || !user) return null;

  const name = user.name;

  return (
    <div className="shrink-0 border-t border-border px-1.5 pt-2.5 pb-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={resources.userMenu.label}
          className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1 text-left hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Avatar>
            {user.image && <AvatarImage src={user.image} alt={name} />}
            <AvatarFallback>{initialsOf(name)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-medium">{name}</span>
            <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
              <Badge
                variant="outline"
                className="h-[19px] rounded-md px-1.5 font-mono text-[10.5px]"
              >
                {isAdmin ? resources.account.admin : resources.account.registered}
              </Badge>
              {isAdmin && hasTwoFactor && <span>{resources.account.twoFactor}</span>}
            </span>
          </span>
          <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex flex-col">
              <span className="truncate text-sm font-medium text-foreground">{name}</span>
              <span className="truncate text-xs font-normal">{user.email}</span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void navigate({ to: '/settings' })}>
            <SettingsIcon />
            {resources.userMenu.settings}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={isPending} onClick={() => signOut()}>
            <LogOutIcon />
            {resources.auth.actions.signOut}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
