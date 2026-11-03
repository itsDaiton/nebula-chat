import { useAuth } from '@/modules/auth/hooks/useAuth';
import { SettingsRow } from '@/modules/settings/components/SettingsRow';
import { TwoFactorBackupStep } from '@/modules/settings/components/TwoFactorBackupStep';
import { TwoFactorConfirmStep } from '@/modules/settings/components/TwoFactorConfirmStep';
import { TwoFactorPasswordStep } from '@/modules/settings/components/TwoFactorPasswordStep';
import { TwoFactorScanStep } from '@/modules/settings/components/TwoFactorScanStep';
import { useHasPassword } from '@/modules/settings/hooks/useHasPassword';
import { useTwoFactorSetupStore } from '@/modules/settings/stores/useTwoFactorSetupStore';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';
import { useOnUnmount } from '@/shared/hooks/useOnUnmount';

const { twoFactor } = resources.settings.security;

/** Two-factor authentication, the setup steps inline: password, scan and confirm, then the backup codes. */
export const TwoFactorSetting = () => {
  const { hasTwoFactor } = useAuth();
  const { data: hasPassword } = useHasPassword();
  const { step, setStep, reset } = useTwoFactorSetupStore();
  // The setup, its URI and its backup codes are dropped when Settings leaves this section.
  const dropOnLeave = useOnUnmount(reset);

  const renderStep = () => {
    switch (step.name) {
      case 'password':
        return <TwoFactorPasswordStep />;
      case 'scan':
        return <TwoFactorScanStep totpURI={step.totpURI} backupCodes={step.backupCodes} />;
      case 'backup':
        return <TwoFactorBackupStep backupCodes={step.backupCodes} />;
      case 'disable':
      case 'regenerate':
        return <TwoFactorConfirmStep action={step.name} />;
      case 'idle':
        break;
    }

    if (hasTwoFactor) {
      return (
        <SettingsRow label={twoFactor.label} description={twoFactor.on}>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep({ name: 'regenerate' })}>
              {twoFactor.regenerate}
            </Button>
            <Button
              variant="destructive"
              className="border-destructive/40 bg-transparent dark:bg-transparent"
              onClick={() => setStep({ name: 'disable' })}
            >
              {twoFactor.turnOff}
            </Button>
          </div>
        </SettingsRow>
      );
    }

    // Without a password there is nothing to confirm with, and better-auth's two-factor needs one.
    if (hasPassword === false) {
      return <SettingsRow label={twoFactor.label} description={twoFactor.needsPassword} />;
    }

    return (
      <SettingsRow label={twoFactor.label} description={twoFactor.description}>
        <Button variant="outline" onClick={() => setStep({ name: 'password' })}>
          {twoFactor.turnOn}
        </Button>
      </SettingsRow>
    );
  };

  return (
    <div ref={dropOnLeave} className="contents">
      {renderStep()}
    </div>
  );
};
