import { Button, Card, Flex, Heading, Tabs, Text } from '@chakra-ui/react';
import { Link } from 'react-router';
import { SignInForm } from '@/modules/auth/components/SignInForm';
import { SignUpForm } from '@/modules/auth/components/SignUpForm';
import { resources } from '@/resources';
import { route } from '@/routing/routes';

// Opt-in: a Guest can use the app without ever coming here.
export const AuthPage = () => (
  <Flex as="main" minH="100dvh" align="center" justify="center" bg="bg.default" px={4}>
    <Card.Root w="full" maxW="md">
      <Card.Header>
        <Heading as="h1" size="xl">
          {resources.auth.page.title}
        </Heading>
        <Text color="fg.muted" fontSize="sm">
          {resources.auth.page.subtitle}
        </Text>
      </Card.Header>
      <Card.Body>
        {/* Only the open form is mounted, so its field labels stay unique. */}
        <Tabs.Root defaultValue="sign-in" lazyMount unmountOnExit fitted>
          <Tabs.List>
            <Tabs.Trigger value="sign-in">{resources.auth.tabs.signIn}</Tabs.Trigger>
            <Tabs.Trigger value="sign-up">{resources.auth.tabs.signUp}</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="sign-in">
            <SignInForm />
          </Tabs.Content>
          <Tabs.Content value="sign-up">
            <SignUpForm />
          </Tabs.Content>
        </Tabs.Root>
      </Card.Body>
      <Card.Footer justifyContent="center">
        <Button asChild variant="ghost" size="sm">
          <Link to={route.chat.root()}>{resources.auth.page.continueAsGuest}</Link>
        </Button>
      </Card.Footer>
    </Card.Root>
  </Flex>
);
