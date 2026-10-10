import { Heading, Text } from '@chakra-ui/react';
import { Navigate } from 'react-router';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { AccountIdSetting } from '@/modules/settings/components/AccountIdSetting';
import { DeleteAccountSetting } from '@/modules/settings/components/DeleteAccountSetting';
import { PasswordSetting } from '@/modules/settings/components/PasswordSetting';
import { ProfileNameForm } from '@/modules/settings/components/ProfileNameForm';
import { SettingsLayout } from '@/modules/settings/components/SettingsLayout';
import { SettingsSection } from '@/modules/settings/components/SettingsSection';
import { SignOutEverywhereSetting } from '@/modules/settings/components/SignOutEverywhereSetting';
import { useSettingsSearch } from '@/modules/settings/hooks/useSettingsSearch';
import { SETTINGS_SECTION_TITLES } from '@/modules/settings/utils/settingsIndex';
import { resources } from '@/resources';
import { route } from '@/routing/routes';

/** A Registered user's Account settings, in their own shell; anyone else is sent to sign in. */
export const SettingsPage = () => {
  const { isPending, isRegistered, user } = useAuth();
  const { isEntryVisible, isSectionVisible, hasMatches } = useSettingsSearch();

  // AuthGate has normally resolved the session already; never redirect on a read still in flight.
  if (isPending) return null;

  if (!isRegistered) return <Navigate to={route.auth.root()} replace />;

  return (
    <SettingsLayout>
      <Heading as="h1" size="xl">
        {resources.settings.sections.account}
      </Heading>
      {isSectionVisible('profile') && (
        <SettingsSection title={SETTINGS_SECTION_TITLES.profile}>
          {isEntryVisible('name') && <ProfileNameForm name={user?.name ?? ''} />}
        </SettingsSection>
      )}
      {isSectionVisible('security') && (
        <SettingsSection title={SETTINGS_SECTION_TITLES.security}>
          {isEntryVisible('password') && <PasswordSetting />}
        </SettingsSection>
      )}
      {isSectionVisible('account') && (
        <SettingsSection title={SETTINGS_SECTION_TITLES.account}>
          {isEntryVisible('signOutEverywhere') && <SignOutEverywhereSetting />}
          {isEntryVisible('deleteAccount') && <DeleteAccountSetting />}
          {isEntryVisible('accountId') && <AccountIdSetting id={user?.id ?? ''} />}
        </SettingsSection>
      )}
      {!hasMatches && <Text color="fg.muted">{resources.settings.search.empty}</Text>}
    </SettingsLayout>
  );
};
