import { Box, Text, VisuallyHidden } from '@chakra-ui/react';
import type { ReactNode } from 'react';
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
import type { SettingsEntryId } from '@/modules/settings/types/types';
import {
  SETTINGS_SECTION_IDS,
  SETTINGS_SECTION_TITLES,
  settingsEntriesIn,
} from '@/modules/settings/utils/settingsIndex';
import { resources } from '@/resources';
import { route } from '@/routing/routes';

/** A Registered user's Account settings, in their own shell; anyone else is sent to sign in. */
export const SettingsPage = () => {
  const { isPending, isRegistered, user } = useAuth();
  const { isEntryVisible, isSectionVisible, hasMatches } = useSettingsSearch();

  // AuthGate has normally resolved the session already; never redirect on a read still in flight.
  if (isPending) return null;

  if (!isRegistered) return <Navigate to={route.auth.root()} replace />;

  // Every searchable entry has exactly one row.
  const rows: Record<SettingsEntryId, ReactNode> = {
    name: <ProfileNameForm name={user?.name ?? ''} />,
    password: <PasswordSetting />,
    signOutEverywhere: <SignOutEverywhereSetting />,
    deleteAccount: <DeleteAccountSetting />,
    accountId: <AccountIdSetting id={user?.id ?? ''} />,
  };

  return (
    <SettingsLayout>
      {/* The nav already names the page; the heading stays for screen readers. */}
      <VisuallyHidden as="h1">{resources.settings.sections.account}</VisuallyHidden>
      {/* Filtered out, not unmounted: a half-typed name or password survives a search. */}
      {SETTINGS_SECTION_IDS.map((section) => (
        <SettingsSection
          key={section}
          title={SETTINGS_SECTION_TITLES[section]}
          hidden={!isSectionVisible(section)}
        >
          {settingsEntriesIn(section).map((id) => (
            <Box key={id} hidden={!isEntryVisible(id)}>
              {rows[id]}
            </Box>
          ))}
        </SettingsSection>
      ))}
      <Text role="status" color="fg.muted">
        {hasMatches ? '' : resources.settings.search.empty}
      </Text>
    </SettingsLayout>
  );
};
