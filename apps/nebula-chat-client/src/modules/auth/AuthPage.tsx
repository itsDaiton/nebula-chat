import { Button, Card, Flex, HStack, Icon, Separator, Tabs, Text } from '@chakra-ui/react';
import { TbGalaxy } from 'react-icons/tb';
import { Link } from 'react-router';
import { AuthForm } from '@/modules/auth/components/AuthForm';
import { usePasswordVisibilityStore } from '@/modules/auth/stores/usePasswordVisibilityStore';
import { SIGN_IN_FORM, SIGN_UP_FORM } from '@/modules/auth/utils/authForms';
import { resources } from '@/resources';
import { route } from '@/routing/routes';

// Opt-in: a Guest can use the app without ever coming here.
export const AuthPage = () => {
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
        <Card.Body>
          {/* Only the open form is mounted, so its field labels stay unique. */}
          <Tabs.Root
            defaultValue="sign-in"
            lazyMount
            unmountOnExit
            fitted
            onValueChange={hidePassword}
          >
            <Tabs.List>
              <Tabs.Trigger value="sign-in">{resources.auth.tabs.signIn}</Tabs.Trigger>
              <Tabs.Trigger value="sign-up">{resources.auth.tabs.signUp}</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="sign-in" pt={6}>
              <AuthForm config={SIGN_IN_FORM} />
            </Tabs.Content>
            <Tabs.Content value="sign-up" pt={6}>
              <AuthForm config={SIGN_UP_FORM} />
            </Tabs.Content>
          </Tabs.Root>
        </Card.Body>
        <Card.Footer flexDirection="column" gap={4}>
          <HStack w="full">
            <Separator flex="1" />
            <Text fontSize="sm" color="fg.muted">
              {resources.auth.page.or}
            </Text>
            <Separator flex="1" />
          </HStack>
          <Button asChild variant="outline" borderColor="border.emphasized" w="full">
            <Link to={route.chat.root()} onClick={hidePassword}>
              {resources.auth.page.continueAsGuest}
            </Link>
          </Button>
        </Card.Footer>
      </Card.Root>
    </Flex>
  );
};
