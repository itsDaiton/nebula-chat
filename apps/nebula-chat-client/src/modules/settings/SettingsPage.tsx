import { Box, Heading, Separator } from '@chakra-ui/react';
import { Navigate } from 'react-router';
import { AuthForm } from '@/modules/auth/components/AuthForm';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { CHANGE_PASSWORD_FORM } from '@/modules/auth/utils/authForms';
import { SettingsLayout } from '@/modules/settings/components/SettingsLayout';
import { resources } from '@/resources';
import { route } from '@/routing/routes';
import { toaster } from '@/shared/components/ui/toaster';

const showPasswordChanged = () =>
  toaster.create({ type: 'success', title: resources.settings.changePassword.done });

/** A Registered user's settings, in their own shell; anyone else is sent to sign in. */
export const SettingsPage = () => {
  const { isPending, isRegistered } = useAuth();

  // AuthGate has normally resolved the session already; never redirect on a read still in flight.
  if (isPending) return null;

  if (!isRegistered) return <Navigate to={route.auth.root()} replace />;

  return (
    <SettingsLayout>
      <Heading as="h1" size="xl">
        {resources.settings.sections.account}
      </Heading>
      <Separator />
      <Box maxW="md">
        <AuthForm config={CHANGE_PASSWORD_FORM} titleAs="h2" onSuccess={showPasswordChanged} />
      </Box>
    </SettingsLayout>
  );
};
