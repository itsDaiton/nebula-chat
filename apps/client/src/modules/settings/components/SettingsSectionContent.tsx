import { ShieldIcon } from 'lucide-react';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { AccountIdSetting } from '@/modules/settings/components/AccountIdSetting';
import { AdminAccessNotice } from '@/modules/settings/components/AdminAccessNotice';
import { AppearanceSetting } from '@/modules/settings/components/AppearanceSetting';
import { ArchivedSessionsSetting } from '@/modules/settings/components/ArchivedSessionsSetting';
import { DeleteAccountSetting } from '@/modules/settings/components/DeleteAccountSetting';
import { PasswordSetting } from '@/modules/settings/components/PasswordSetting';
import { ProfileImageSetting } from '@/modules/settings/components/ProfileImageSetting';
import { ProfileNameForm } from '@/modules/settings/components/ProfileNameForm';
import { SettingsGroup } from '@/modules/settings/components/SettingsGroup';
import { SignOutEverywhereSetting } from '@/modules/settings/components/SignOutEverywhereSetting';
import { TwoFactorSetting } from '@/modules/settings/components/TwoFactorSetting';
import type { SettingsSectionId } from '@/modules/settings/types/types';
import { resources } from '@/resources';

const { adminNotice } = resources.settings.security;

/** The body of the active section. */
export const SettingsSectionContent = ({ section }: { section: SettingsSectionId }) => {
  const { user, isAdmin, hasTwoFactor } = useAuth();

  switch (section) {
    case 'profile':
      return (
        <SettingsGroup>
          <ProfileImageSetting name={user?.name ?? ''} image={user?.image ?? null} />
          <ProfileNameForm name={user?.name ?? ''} />
        </SettingsGroup>
      );
    case 'security':
      return (
        <div className="flex flex-col gap-4">
          {isAdmin && !hasTwoFactor && (
            <div
              role="note"
              className="flex gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm"
            >
              <ShieldIcon className="mt-0.5 size-4 shrink-0 text-warning" />
              <p>
                <strong className="font-medium">{adminNotice.title}</strong> {adminNotice.body}
              </p>
            </div>
          )}
          <SettingsGroup>
            <PasswordSetting />
            <TwoFactorSetting />
            <SignOutEverywhereSetting />
          </SettingsGroup>
        </div>
      );
    case 'archived':
      return <ArchivedSessionsSetting />;
    case 'appearance':
      return <AppearanceSetting />;
    case 'account':
      return (
        <div className="flex flex-col gap-4">
          <AdminAccessNotice />
          <SettingsGroup>
            <AccountIdSetting id={user?.id ?? ''} />
            <DeleteAccountSetting />
          </SettingsGroup>
        </div>
      );
  }
};
