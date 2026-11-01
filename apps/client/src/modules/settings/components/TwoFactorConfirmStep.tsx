import { toast } from 'sonner';
import { PasswordPrompt } from '@/modules/settings/components/PasswordPrompt';
import {
  useDisableTwoFactor,
  useRegenerateBackupCodes,
} from '@/modules/settings/hooks/useTwoFactor';
import { useTwoFactorSetupStore } from '@/modules/settings/stores/useTwoFactorSetupStore';
import type { TwoFactorConfirmStepProps } from '@/modules/settings/types/types';
import { resources } from '@/resources';

const { twoFactor } = resources.settings.security;

/** Turning two-factor off, or asking for new backup codes: both need the password again. */
export const TwoFactorConfirmStep = ({ action }: TwoFactorConfirmStepProps) => {
  const { setStep, reset } = useTwoFactorSetupStore();
  const disable = useDisableTwoFactor();
  const regenerate = useRegenerateBackupCodes();
  const isDisable = action === 'disable';
  const pending = isDisable ? disable : regenerate;

  return (
    <div className="flex flex-col gap-3 px-4 py-3.5">
      <p className="text-sm font-medium">{twoFactor.label}</p>
      <PasswordPrompt
        prompt={isDisable ? twoFactor.disablePrompt : twoFactor.regeneratePrompt}
        submitLabel={isDisable ? twoFactor.turnOff : twoFactor.regenerate}
        isPending={pending.isPending}
        error={pending.error?.message}
        onCancel={reset}
        onSubmit={(password) =>
          isDisable
            ? disable.mutate(password, {
                onSuccess: () => {
                  reset();
                  toast.success(twoFactor.disabled);
                },
              })
            : regenerate.mutate(password, {
                onSuccess: (backupCodes) => setStep({ name: 'backup', backupCodes }),
              })
        }
      />
    </div>
  );
};
