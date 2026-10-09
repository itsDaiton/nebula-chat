import { Heading, Stack } from '@chakra-ui/react';
import { Navigate } from 'react-router';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { resources } from '@/resources';
import { route } from '@/routing/routes';
import { Layout } from '@/shared/components/layout/Layout';

const PASSWORD_SECTION_ID = 'settings-password';

/** A Registered user's account settings, in the app shell; anyone else is sent to sign in. */
export const SettingsPage = () => {
  const { isPending, isRegistered } = useAuth();

  // AuthGate has normally resolved the session already; never redirect on a read still in flight.
  if (isPending) return null;

  if (!isRegistered) return <Navigate to={route.auth.root()} replace />;

  return (
    <Layout>
      <Stack gap={8} maxW="2xl" mx="auto" w="full">
        <Heading as="h1" size="2xl">
          {resources.settings.title}
        </Heading>
        <Stack as="section" gap={4} aria-labelledby={PASSWORD_SECTION_ID}>
          <Heading as="h2" size="lg" id={PASSWORD_SECTION_ID}>
            {resources.settings.password.title}
          </Heading>
        </Stack>
      </Stack>
    </Layout>
  );
};
