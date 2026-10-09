import { Box, Menu, Text } from '@chakra-ui/react';
import { LuLogIn, LuLogOut, LuSettings } from 'react-icons/lu';
import { useNavigate } from 'react-router';
import { UserMenu } from '@/modules/auth/components/UserMenu';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useSignOut } from '@/modules/auth/hooks/useSignOut';
import { resources } from '@/resources';
import { route } from '@/routing/routes';

/** The header's account control: a Guest is offered sign-in, a Registered user Settings and sign-out. */
export const AccountStatus = () => {
  const { user, isGuest, isRegistered } = useAuth();
  const { mutate: signOut, isPending } = useSignOut();
  // Not a Link: Zag activates a link item from the keyboard with a click React never sees.
  const navigate = useNavigate();

  if (isGuest) {
    return (
      <UserMenu>
        <Box px={2} py={1.5}>
          <Text fontSize="sm" fontWeight="medium">
            {resources.userMenu.guest}
          </Text>
        </Box>
        <Menu.Item value="sign-in" onSelect={() => void navigate(route.auth.root())}>
          <LuLogIn />
          {resources.auth.actions.signIn}
        </Menu.Item>
      </UserMenu>
    );
  }

  if (isRegistered) {
    return (
      <UserMenu name={user?.name}>
        <Box px={2} py={1.5}>
          <Text fontSize="sm" fontWeight="medium" truncate>
            {user?.name}
          </Text>
          <Text fontSize="xs" color="fg.muted" truncate>
            {user?.email}
          </Text>
        </Box>
        <Menu.Item value="settings" onSelect={() => void navigate(route.settings.root())}>
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
