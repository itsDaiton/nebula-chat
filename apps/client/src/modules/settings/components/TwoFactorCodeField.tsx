import { REGEXP_ONLY_DIGITS } from 'input-otp';
import type { TwoFactorCodeFieldProps } from '@/modules/settings/types/types';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/shared/components/ui/input-otp';

const { twoFactor } = resources.settings.security;

const CODE_LENGTH = 6;

/** The 6-digit code input with its submit button and inline failure, shared by the setup and step-up forms. */
export const TwoFactorCodeField = ({
  code,
  onChange,
  isPending,
  error,
}: TwoFactorCodeFieldProps) => (
  <>
    <label htmlFor="two-factor-code" className="text-[13px] font-medium">
      {twoFactor.code}
    </label>
    <div className="flex flex-wrap items-center gap-3">
      <InputOTP
        id="two-factor-code"
        maxLength={CODE_LENGTH}
        value={code}
        onChange={onChange}
        pattern={REGEXP_ONLY_DIGITS}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-invalid={Boolean(error)}
        // Apps show the code as "123 456", so a paste is cleaned of everything but digits.
        pasteTransformer={(text) => text.replaceAll(/\D/g, '')}
      >
        <InputOTPGroup className="gap-2">
          {Array.from({ length: CODE_LENGTH }, (_, index) => (
            <InputOTPSlot
              key={index}
              index={index}
              className="size-10 rounded-lg border font-mono text-base first:rounded-lg first:border last:rounded-lg"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
      <Button type="submit" disabled={code.length !== CODE_LENGTH || isPending}>
        {twoFactor.verify}
      </Button>
    </div>
    {error && (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    )}
  </>
);
