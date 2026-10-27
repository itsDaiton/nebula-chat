import { Box, Menu, Text } from '@chakra-ui/react';
import { Link, useNavigate } from '@tanstack/react-router';
import { LuLogIn, LuLogOut, LuSettings } from 'react-icons/lu';
import { UserMenu } from '@/modules/auth/components/UserMenu';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useSignOut } from '@/modules/auth/hooks/useSignOut';
import { resources } from '@/resources';
import { buttonVariants } from '@/shared/components/ui/button';
import { cn } from '@/shared/utils/cn';

/** The header's account control: a Guest is nudged to sign in, a Registered user gets their user menu. */
export const AccountStatus = () => {
  const { user, isGuest, isRegistered } = useAuth();
  const { mutate: signOut, isPending } = useSignOut();
  // Menu items aren't Links: Zag activates a link item from the keyboard with a click React never sees.
  const navigate = useNavigate();

  if (isGuest) {
    return (
      <Link to="/auth" className={cn(buttonVariants(), 'h-8 rounded-full px-4 text-[13px]')}>
        <LuLogIn />
        {resources.auth.actions.signIn}
      </Link>
    );
  }

  if (isRegistered) {
    return (
      <UserMenu name={user?.name ?? ''} image={user?.image}>
        <Box px={2} py={1.5}>
          <Text fontSize="sm" fontWeight="medium" truncate>
            {user?.name}
          </Text>
          <Text fontSize="xs" color="fg.muted" truncate>
            {user?.email}
          </Text>
        </Box>
        <Menu.Item value="settings" onSelect={() => void navigate({ to: '/settings' })}>
          <LuSettings />
          {resources.userMenu.settings}
        </Menu.Item>
        <Menu.Separator />
        <Menu.Item value="sign-out" disabled={isPending} onSelect={() => signOut()}>
          <LuLogOut />
          {resources.auth.actions.signOut}
        </Menu.Item>
      </UserMenu>
    );
  }

  return null;
};
