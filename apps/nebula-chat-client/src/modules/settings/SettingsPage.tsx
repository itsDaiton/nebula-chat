import { Box, Heading, Text } from '@chakra-ui/react';
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
      {/* Filtered out, not unmounted: a half-typed name or password survives a search. */}
      <SettingsSection
        title={SETTINGS_SECTION_TITLES.profile}
        hidden={!isSectionVisible('profile')}
      >
        <Box hidden={!isEntryVisible('name')}>
          <ProfileNameForm name={user?.name ?? ''} />
        </Box>
      </SettingsSection>
      <SettingsSection
        title={SETTINGS_SECTION_TITLES.security}
        hidden={!isSectionVisible('security')}
      >
        <Box hidden={!isEntryVisible('password')}>
          <PasswordSetting />
        </Box>
      </SettingsSection>
      <SettingsSection
        title={SETTINGS_SECTION_TITLES.account}
        hidden={!isSectionVisible('account')}
      >
        <Box hidden={!isEntryVisible('signOutEverywhere')}>
          <SignOutEverywhereSetting />
        </Box>
        <Box hidden={!isEntryVisible('deleteAccount')}>
          <DeleteAccountSetting />
        </Box>
        <Box hidden={!isEntryVisible('accountId')}>
          <AccountIdSetting id={user?.id ?? ''} />
        </Box>
      </SettingsSection>
      <Text role="status" color="fg.muted">
        {hasMatches ? '' : resources.settings.search.empty}
      </Text>
    </SettingsLayout>
  );
};
