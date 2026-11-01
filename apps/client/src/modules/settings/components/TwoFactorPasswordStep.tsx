import { PasswordPrompt } from '@/modules/settings/components/PasswordPrompt';
import { TwoFactorSetupHeader } from '@/modules/settings/components/TwoFactorSetupHeader';
import { useEnableTwoFactor } from '@/modules/settings/hooks/useTwoFactor';
import { useTwoFactorSetupStore } from '@/modules/settings/stores/useTwoFactorSetupStore';
import { resources } from '@/resources';

const { twoFactor } = resources.settings.security;

/** Step 1: the password that starts the setup. */
export const TwoFactorPasswordStep = () => {
  const { setStep, reset } = useTwoFactorSetupStore();
  const enable = useEnableTwoFactor();

  return (
    <div className="flex flex-col gap-3 px-4 py-3.5">
      <TwoFactorSetupHeader step={1} text={twoFactor.passwordStep} />
      <PasswordPrompt
        prompt={twoFactor.passwordStep}
        submitLabel={twoFactor.continue}
        isPending={enable.isPending}
        error={enable.error?.message}
        onCancel={reset}
        onSubmit={(password) =>
          enable.mutate(password, {
            onSuccess: ({ totpURI, backupCodes }) =>
              setStep({ name: 'scan', totpURI, backupCodes }),
          })
        }
      />
    </div>
  );
};
