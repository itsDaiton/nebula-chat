import { zodResolver } from '@hookform/resolvers/zod';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Loader2Icon } from 'lucide-react';
import { useId } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { AuthFormAlert } from '@/modules/auth/components/AuthFormAlert';
import { useVerifySecondFactor } from '@/modules/auth/hooks/useVerifySecondFactor';
import type { TwoFactorCodeFormProps, TwoFactorCodeValues } from '@/modules/auth/types/types';
import { AuthRequestError } from '@/modules/auth/utils/AuthRequestError';
import { authOutcomeOf } from '@/modules/auth/utils/authOutcome';
import { backupCodeSchema, totpCodeSchema } from '@/modules/auth/utils/authSchemas';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/shared/components/ui/input-otp';

const { twoFactor } = resources.auth;

const SLOT_CLASS =
  'h-[50px] w-10 rounded-[10px] border border-border-strong bg-canvas font-mono text-xl font-medium first:rounded-[10px] first:border last:rounded-[10px] data-[active=true]:border-foreground data-[active=true]:ring-0 sm:w-11 dark:bg-raised';

/** The code (or a backup code) that finishes a sign-in held back for its second factor. */
export const TwoFactorCodeForm = ({ method, onOutcome }: TwoFactorCodeFormProps) => {
  const { mutate, isPending } = useVerifySecondFactor();
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<TwoFactorCodeValues>({
    resolver: zodResolver(method === 'totp' ? totpCodeSchema : backupCodeSchema),
    mode: 'onTouched',
    // The challenge carries no role, so an Admin (who can't trust a device) is offered it too.
    defaultValues: { code: '', trustDevice: true },
  });
  const codeId = useId();
  const errorId = `${codeId}-error`;
  const codeError = errors.code?.message;
  const invalid = {
    id: codeId,
    'aria-invalid': Boolean(codeError),
    'aria-errormessage': codeError ? errorId : undefined,
  };

  const onSubmit = (values: TwoFactorCodeValues) =>
    mutate(
      { method, ...values },
      {
        onError: (error) => {
          const outcome = authOutcomeOf(error);
          if (outcome) return onOutcome(outcome);
          const onCode = error instanceof AuthRequestError && error.field === 'code';
          setError(onCode ? 'code' : 'root.server', { message: error.message });
        },
      },
    );

  return (
    <form
      aria-label={twoFactor.title}
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="mt-[18px] flex flex-col gap-4"
    >
      <AuthFormAlert message={errors.root?.server?.message} />
      <div className="flex flex-col gap-2">
        <label htmlFor={codeId} className="sr-only">
          {method === 'totp' ? twoFactor.code : twoFactor.backupCode}
        </label>
        {method === 'totp' ? (
          <Controller
            control={control}
            name="code"
            render={({ field }) => (
              <InputOTP
                maxLength={6}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                pattern={REGEXP_ONLY_DIGITS}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                // Apps show the code as "123 456", so a paste keeps only its digits.
                pasteTransformer={(text) => text.replaceAll(/\D/g, '')}
                containerClassName="gap-2"
                {...invalid}
              >
                <InputOTPGroup className="gap-2">
                  {[0, 1, 2].map((index) => (
                    <InputOTPSlot key={index} index={index} className={SLOT_CLASS} />
                  ))}
                </InputOTPGroup>
                <InputOTPSeparator className="w-2.5 text-faint [&_svg]:w-2.5" />
                <InputOTPGroup className="gap-2">
                  {[3, 4, 5].map((index) => (
                    <InputOTPSlot key={index} index={index} className={SLOT_CLASS} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            )}
          />
        ) : (
          <Input
            autoComplete="one-time-code"
            autoFocus
            spellCheck={false}
            className="font-mono"
            {...invalid}
            {...register('code')}
          />
        )}
        {codeError && (
          <p id={errorId} className="text-sm text-destructive">
            {codeError}
          </p>
        )}
      </div>
      <label className="flex items-center gap-2 text-[13px] text-foreground-secondary">
        <Controller
          control={control}
          name="trustDevice"
          render={({ field }) => (
            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
        {twoFactor.trustDevice}
      </label>
      <Button type="submit" size="lg" className="w-full" disabled={isPending} aria-busy={isPending}>
        {isPending && <Loader2Icon className="animate-spin" />}
        {twoFactor.verify}
      </Button>
    </form>
  );
};
