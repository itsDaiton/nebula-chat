import { Heading } from '@chakra-ui/react';
import { Navigate } from 'react-router';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { PasswordSetting } from '@/modules/settings/components/PasswordSetting';
import { ProfileNameForm } from '@/modules/settings/components/ProfileNameForm';
import { SettingsLayout } from '@/modules/settings/components/SettingsLayout';
import { SettingsSection } from '@/modules/settings/components/SettingsSection';
import { resources } from '@/resources';
import { route } from '@/routing/routes';

/** A Registered user's Account settings, in their own shell; anyone else is sent to sign in. */
export const SettingsPage = () => {
  const { isPending, isRegistered, user } = useAuth();

  // AuthGate has normally resolved the session already; never redirect on a read still in flight.
  if (isPending) return null;

  if (!isRegistered) return <Navigate to={route.auth.root()} replace />;

  return (
    <SettingsLayout>
      <Heading as="h1" size="xl">
        {resources.settings.sections.account}
      </Heading>
      <SettingsSection title={resources.settings.profile.title}>
        <ProfileNameForm name={user?.name ?? ''} />
      </SettingsSection>
      <SettingsSection title={resources.settings.security.title}>
        <PasswordSetting />
      </SettingsSection>
    </SettingsLayout>
  );
};
