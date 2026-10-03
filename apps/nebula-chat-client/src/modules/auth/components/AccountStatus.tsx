import { Badge, Button, Flex, Text } from '@chakra-ui/react';
import { Link } from 'react-router';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useSignOut } from '@/modules/auth/hooks/useSignOut';
import { resources } from '@/resources';
import { route } from '@/routing/routes';

/** The nav's Guest-vs-Registered indicator, with the matching sign-in or sign-out control. */
export const AccountStatus = () => {
  const { user, isGuest, isRegistered } = useAuth();
  const { mutate: signOut, isPending } = useSignOut();

  if (isGuest) {
    return (
      <Flex gap={2} alignItems="center">
        <Badge variant="subtle">{resources.auth.status.guest}</Badge>
        <Button asChild variant="outline" size="sm">
          <Link to={route.auth()}>{resources.auth.actions.signIn}</Link>
        </Button>
      </Flex>
    );
  }

  if (isRegistered) {
    return (
      <Flex gap={2} alignItems="center">
        <Badge variant="subtle" colorPalette="green">
          {resources.auth.status.registered}
        </Badge>
        <Text fontSize="sm" color="fg.muted" display={{ base: 'none', md: 'block' }}>
          {user?.email}
        </Text>
        <Button variant="outline" size="sm" loading={isPending} onClick={() => signOut()}>
          {resources.auth.actions.signOut}
        </Button>
      </Flex>
    );
  }

  return null;
};
