import { Button } from '@chakra-ui/react';
import { SettingsRow } from '@/modules/settings/components/SettingsRow';
import { useSignOutEverywhere } from '@/modules/settings/hooks/useSignOutEverywhere';
import { resources } from '@/resources';

const { signOutEverywhere } = resources.settings.account;

export const SignOutEverywhereSetting = () => {
  const { mutate, isPending } = useSignOutEverywhere();

  return (
    <SettingsRow label={signOutEverywhere.label} description={signOutEverywhere.description}>
      <Button variant="outline" loading={isPending} onClick={() => mutate()}>
        {signOutEverywhere.action}
      </Button>
    </SettingsRow>
  );
};
