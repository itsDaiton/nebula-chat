import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { LuLogIn, LuLogOut } from 'react-icons/lu';
import { Link } from 'react-router';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useSignOut } from '@/modules/auth/hooks/useSignOut';
import { resources } from '@/resources';
import { route } from '@/routing/routes';

/** The nav's account control: a Guest is nudged to sign in, a Registered user can sign out. */
export const AccountStatus = () => {
  const { user, isGuest, isRegistered } = useAuth();
  const { mutate: signOut, isPending } = useSignOut();

  if (isGuest) {
    return (
      <Button asChild size="sm" variant="solid" borderRadius="full" px={4}>
        <Link to={route.auth.root()}>
          <LuLogIn />
          {resources.auth.actions.signIn}
        </Link>
      </Button>
    );
  }

  if (isRegistered) {
    return (
      <Flex gap={1} alignItems="center">
        <Text fontSize="sm" color="fg.muted" display={{ base: 'none', md: 'block' }}>
          {user?.email}
        </Text>
        <Button
          variant="ghost"
          size="sm"
          aria-label={resources.auth.actions.signOut}
          loading={isPending}
          onClick={() => signOut()}
        >
          <LuLogOut />
          <Box as="span" display={{ base: 'none', md: 'inline' }}>
            {resources.auth.actions.signOut}
          </Box>
        </Button>
      </Flex>
    );
  }

  return null;
};
