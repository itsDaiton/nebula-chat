import { OwnKeyProvider } from '@/libs/api/generated/model/ownKeyProvider';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { OwnKeySetting } from '@/modules/settings/components/OwnKeySetting';
import { SettingsGroup } from '@/modules/settings/components/SettingsGroup';
import { useOwnKeys } from '@/modules/settings/hooks/useOwnKeys';
import { resources } from '@/resources';

const { intro, unverified, off } = resources.settings.ownKeys;

const PROVIDERS = [OwnKeyProvider.openai, OwnKeyProvider.anthropic];

/** The API keys section: one row per provider, for a verified Registered user. */
export const OwnKeysSetting = () => {
  const { user } = useAuth();
  const verified = Boolean(user?.emailVerified);
  const { data } = useOwnKeys({ enabled: verified });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-muted-foreground">{intro}</p>
      {!verified && (
        <p role="note" className="text-sm">
          {unverified}
        </p>
      )}
      {verified && data?.enabled === false && (
        <p role="note" className="text-sm">
          {off}
        </p>
      )}
      {verified && data?.enabled && (
        <SettingsGroup>
          {PROVIDERS.map((provider) => (
            <OwnKeySetting
              key={provider}
              provider={provider}
              stored={data.keys.find((key) => key.provider === provider)}
            />
          ))}
        </SettingsGroup>
      )}
    </div>
  );
};
