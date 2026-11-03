import { CheckIcon } from 'lucide-react';
import { BackupCodes } from '@/modules/settings/components/BackupCodes';
import { TwoFactorSetupHeader } from '@/modules/settings/components/TwoFactorSetupHeader';
import { useTwoFactorSetupStore } from '@/modules/settings/stores/useTwoFactorSetupStore';
import type { TwoFactorBackupStepProps } from '@/modules/settings/types/types';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';

const { twoFactor } = resources.settings.security;

/** Step 3: the backup codes, shown once. */
export const TwoFactorBackupStep = ({ backupCodes }: TwoFactorBackupStepProps) => {
  const reset = useTwoFactorSetupStore((state) => state.reset);

  return (
    <div className="flex flex-col gap-3 px-4 py-3.5">
      <TwoFactorSetupHeader step={3} text={`${twoFactor.backupStep} ${twoFactor.backupWarning}`} />
      <BackupCodes codes={backupCodes} />
      <div>
        <Button onClick={reset}>
          <CheckIcon />
          {twoFactor.done}
        </Button>
      </div>
    </div>
  );
};
