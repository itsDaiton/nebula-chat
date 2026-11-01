import type { TwoFactorSetupHeaderProps } from '@/modules/settings/types/types';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';

const { twoFactor } = resources.settings.security;

export const TwoFactorSetupHeader = ({ step, text, onCancel }: TwoFactorSetupHeaderProps) => (
  <div className="flex items-start justify-between gap-4">
    <div>
      <p className="text-sm font-medium">{twoFactor.label}</p>
      <p className="text-[13px] text-muted-foreground">
        {twoFactor.step(step, 3)} · {text}
      </p>
    </div>
    {onCancel && (
      <Button variant="ghost" onClick={onCancel}>
        {twoFactor.cancel}
      </Button>
    )}
  </div>
);
