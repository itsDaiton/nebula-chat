import type { AuthSwitchProps } from '@/modules/auth/types/types';
import { Button } from '@/shared/components/ui/button';

export const AuthSwitch = ({ prompt, action, onSwitch }: AuthSwitchProps) => (
  <p className="mt-4 text-center text-[12.5px] text-muted-foreground">
    {prompt}{' '}
    <Button
      variant="link"
      className="h-auto p-0 text-[12.5px] text-foreground underline underline-offset-3"
      onClick={onSwitch}
    >
      {action}
    </Button>
  </p>
);
