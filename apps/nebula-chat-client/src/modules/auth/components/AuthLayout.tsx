import { Card, Flex, Icon, Text } from '@chakra-ui/react';
import { TbGalaxy } from 'react-icons/tb';
import { Link } from 'react-router';
import { usePasswordVisibilityStore } from '@/modules/auth/stores/usePasswordVisibilityStore';
import type { AuthLayoutProps } from '@/modules/auth/types/types';
import { resources } from '@/resources';
import { route } from '@/routing/routes';

/** The shell every auth page shares: the app's mark above a single card. */
export const AuthLayout = ({ children, footer }: AuthLayoutProps) => {
  const { hidePassword } = usePasswordVisibilityStore();

  return (
    <Flex
      as="main"
      minH="100dvh"
      direction="column"
      align="center"
      justify="center"
      gap={6}
      bg="bg.default"
      px={4}
    >
      <Flex asChild align="center" gap={2}>
        <Link to={route.chat.root()} onClick={hidePassword}>
          <Icon as={TbGalaxy} boxSize={10} aria-hidden />
          <Text fontSize="2xl" fontWeight="bold" letterSpacing="-0.03em">
            {resources.chat.appName}
          </Text>
        </Link>
      </Flex>
      <Card.Root w="full" maxW="md">
        <Card.Body>{children}</Card.Body>
        {footer && (
          <Card.Footer flexDirection="column" gap={4}>
            {footer}
          </Card.Footer>
        )}
      </Card.Root>
    </Flex>
  );
};
