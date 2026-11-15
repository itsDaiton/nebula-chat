import { toast } from 'sonner';
import { TwoFactorCodeField } from '@/modules/settings/components/TwoFactorCodeField';
import { useStepUpTwoFactor } from '@/modules/settings/hooks/useTwoFactor';
import { useTwoFactorSetupStore } from '@/modules/settings/stores/useTwoFactorSetupStore';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';

const { twoFactor } = resources.settings.security;

/** Verifies a code on the signed-in session, the step-up an Admin who signed in without a challenge needs. */
export const TwoFactorVerifyStep = () => {
  const { code, setCode, reset } = useTwoFactorSetupStore();
  const verify = useStepUpTwoFactor();

  return (
    <form
      className="flex flex-col gap-3 px-4 py-3.5"
      onSubmit={(event) => {
        event.preventDefault();
        verify.mutate(code, {
          onSuccess: () => {
            reset();
            toast.success(twoFactor.verified);
          },
        });
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium">{twoFactor.label}</p>
          <p className="text-[13px] text-muted-foreground">{twoFactor.verifyStep}</p>
        </div>
        <Button type="button" variant="ghost" onClick={reset}>
          {twoFactor.cancel}
        </Button>
      </div>
      <TwoFactorCodeField
        code={code}
        onChange={setCode}
        isPending={verify.isPending}
        error={verify.error?.message}
      />
    </form>
  );
};
