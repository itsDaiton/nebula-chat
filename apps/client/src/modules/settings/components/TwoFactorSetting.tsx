import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { BackupCodes } from '@/modules/settings/components/BackupCodes';
import { PasswordPrompt } from '@/modules/settings/components/PasswordPrompt';
import { QrCode } from '@/modules/settings/components/QrCode';
import { SettingsRow } from '@/modules/settings/components/SettingsRow';
import { useHasPassword } from '@/modules/settings/hooks/useHasPassword';
import {
  useDisableTwoFactor,
  useEnableTwoFactor,
  useRegenerateBackupCodes,
  useVerifyTwoFactor,
} from '@/modules/settings/hooks/useTwoFactor';
import type { TwoFactorStep } from '@/modules/settings/types/types';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/shared/components/ui/input-otp';

const { twoFactor } = resources.settings.security;

/** The secret inside a `otpauth://` URI, grouped in fours the way an app asks for it. */
const manualKey = (totpURI: string) =>
  (new URL(totpURI).searchParams.get('secret') ?? '').replace(/(.{4})(?=.)/g, '$1 ');

const SetupHeader = ({
  step,
  text,
  onCancel,
}: {
  step: number;
  text: string;
  onCancel?: () => void;
}) => (
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

/** Two-factor authentication, the setup steps inline: password, scan and confirm, then the backup codes. */
export const TwoFactorSetting = () => {
  const { hasTwoFactor } = useAuth();
  const { data: hasPassword } = useHasPassword();
  const [step, setStep] = useState<TwoFactorStep>({ name: 'idle' });
  const [code, setCode] = useState('');
  const enable = useEnableTwoFactor();
  const verify = useVerifyTwoFactor();
  const disable = useDisableTwoFactor();
  const regenerate = useRegenerateBackupCodes();

  const idle = () => {
    enable.reset();
    verify.reset();
    disable.reset();
    regenerate.reset();
    setCode('');
    setStep({ name: 'idle' });
  };

  if (step.name === 'password') {
    return (
      <div className="flex flex-col gap-3 px-4 py-3.5">
        <SetupHeader step={1} text={twoFactor.passwordStep} />
        <PasswordPrompt
          prompt={twoFactor.passwordStep}
          submitLabel={twoFactor.continue}
          isPending={enable.isPending}
          error={enable.error?.message}
          onCancel={idle}
          onSubmit={(password) =>
            enable.mutate(password, {
              onSuccess: ({ totpURI, backupCodes }) =>
                setStep({ name: 'scan', totpURI, backupCodes }),
            })
          }
        />
      </div>
    );
  }

  if (step.name === 'scan') {
    const key = manualKey(step.totpURI);
    const { backupCodes } = step;
    return (
      <div className="flex flex-col gap-4 px-4 py-3.5">
        <SetupHeader step={2} text={twoFactor.scanStep} onCancel={idle} />
        <div className="flex flex-col gap-4 sm:flex-row">
          <QrCode value={step.totpURI} label={twoFactor.qr} />
          <form
            className="flex min-w-0 flex-1 flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              verify.mutate(code, { onSuccess: () => setStep({ name: 'backup', backupCodes }) });
            }}
          >
            <div className="flex flex-col gap-1">
              <p className="text-[13px] text-muted-foreground">{twoFactor.manualKey}</p>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-1.5 font-mono text-sm">
                <span data-testid="manual-key">{key}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={twoFactor.copyKey}
                  onClick={() => {
                    void navigator.clipboard.writeText(key.replaceAll(' ', ''));
                    toast(twoFactor.copied);
                  }}
                >
                  <CopyIcon />
                </Button>
              </div>
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
                // Apps show the code as "123 456", so a paste is cleaned of everything but digits.
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
        </div>
      </div>
    );
  }

  if (step.name === 'backup') {
    return (
      <div className="flex flex-col gap-3 px-4 py-3.5">
        <SetupHeader step={3} text={`${twoFactor.backupStep} ${twoFactor.backupWarning}`} />
        <BackupCodes codes={step.backupCodes} />
        <div>
          <Button onClick={idle}>
            <CheckIcon />
            {twoFactor.done}
          </Button>
        </div>
      </div>
    );
  }

  if (step.name === 'disable' || step.name === 'regenerate') {
    const isDisable = step.name === 'disable';
    const action = isDisable ? disable : regenerate;
    return (
      <div className="flex flex-col gap-3 px-4 py-3.5">
        <p className="text-sm font-medium">{twoFactor.label}</p>
        <PasswordPrompt
          prompt={isDisable ? twoFactor.disablePrompt : twoFactor.regeneratePrompt}
          submitLabel={isDisable ? twoFactor.turnOff : twoFactor.regenerate}
          isPending={action.isPending}
          error={action.error?.message}
          onCancel={idle}
          onSubmit={(password) =>
            isDisable
              ? disable.mutate(password, {
                  onSuccess: () => {
                    idle();
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
