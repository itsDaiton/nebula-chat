import { Button, HStack, Link as ChakraLink, Separator, Tabs, Text } from '@chakra-ui/react';
import { Link } from 'react-router';
import { AuthForm } from '@/modules/auth/components/AuthForm';
import { AuthLayout } from '@/modules/auth/components/AuthLayout';
import { useIdentityChange } from '@/modules/auth/hooks/useIdentityChange';
import { usePasswordVisibilityStore } from '@/modules/auth/stores/usePasswordVisibilityStore';
import { SIGN_IN_FORM, SIGN_UP_FORM } from '@/modules/auth/utils/authForms';
import { resources } from '@/resources';
import { route } from '@/routing/routes';

// Opt-in: a Guest can use the app without ever coming here.
export const AuthPage = () => {
  const { hidePassword } = usePasswordVisibilityStore();
  // The server claims a current Guest's conversations into the account on either form.
  const onIdentityChange = useIdentityChange();

  return (
    <AuthLayout
      footer={
        <>
          <HStack w="full">
            <Separator flex="1" />
            <Text fontSize="sm" color="fg.muted">
              {resources.auth.page.or}
            </Text>
            <Separator flex="1" />
          </HStack>
          <Button asChild variant="outline" borderColor="border.emphasized" w="full">
            <Link to={route.chat.root()} onClick={hidePassword}>
              {resources.auth.page.continueWithoutAccount}
            </Link>
          </Button>
        </>
      }
    >
      {/* Only the open form is mounted, so its field labels stay unique. */}
      <Tabs.Root defaultValue="sign-in" lazyMount unmountOnExit fitted onValueChange={hidePassword}>
        <Tabs.List>
          <Tabs.Trigger value="sign-in">{resources.auth.tabs.signIn}</Tabs.Trigger>
          <Tabs.Trigger value="sign-up">{resources.auth.tabs.signUp}</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="sign-in" pt={6}>
          <AuthForm config={SIGN_IN_FORM} onSuccess={onIdentityChange} />
          <ChakraLink asChild fontSize="sm" color="fg.muted" mt={4}>
            <Link to={route.auth.forgotPassword()} onClick={hidePassword}>
              {resources.auth.signIn.forgotPassword}
            </Link>
          </ChakraLink>
        </Tabs.Content>
        <Tabs.Content value="sign-up" pt={6}>
          <AuthForm config={SIGN_UP_FORM} onSuccess={onIdentityChange} />
        </Tabs.Content>
      </Tabs.Root>
    </AuthLayout>
  );
};
