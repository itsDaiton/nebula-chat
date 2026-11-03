import { SettingsRow } from '@/modules/settings/components/SettingsRow';
import { useSignOutEverywhere } from '@/modules/settings/hooks/useSignOutEverywhere';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';

const { signOutEverywhere } = resources.settings.security;

export const SignOutEverywhereSetting = () => {
  const { mutate, isPending } = useSignOutEverywhere();

  return (
    <SettingsRow label={signOutEverywhere.label} description={signOutEverywhere.description}>
      <Button
        variant="destructive"
        className="border-destructive/40 bg-transparent dark:bg-transparent"
        disabled={isPending}
        onClick={() => mutate()}
      >
        {signOutEverywhere.action}
      </Button>
    </SettingsRow>
  );
};
