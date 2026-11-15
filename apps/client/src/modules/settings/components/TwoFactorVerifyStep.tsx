import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { toast } from 'sonner';
import { useStepUpTwoFactor } from '@/modules/settings/hooks/useTwoFactor';
import { useTwoFactorSetupStore } from '@/modules/settings/stores/useTwoFactorSetupStore';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/shared/components/ui/input-otp';

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
      <label htmlFor="two-factor-code" className="text-[13px] font-medium">
        {twoFactor.code}
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <InputOTP
          id="two-factor-code"
          maxLength={6}
          value={code}
          onChange={setCode}
          pattern={REGEXP_ONLY_DIGITS}
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-invalid={Boolean(verify.error)}
          pasteTransformer={(text) => text.replaceAll(/\D/g, '')}
        >
          <InputOTPGroup className="gap-2">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <InputOTPSlot
                key={index}
                index={index}
                className="size-10 rounded-lg border font-mono text-base first:rounded-lg first:border last:rounded-lg"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
        <Button type="submit" disabled={code.length !== 6 || verify.isPending}>
          {twoFactor.verify}
        </Button>
      </div>
      {verify.error && (
        <p role="alert" className="text-sm text-destructive">
          {verify.error.message}
        </p>
      )}
    </form>
  );
};
