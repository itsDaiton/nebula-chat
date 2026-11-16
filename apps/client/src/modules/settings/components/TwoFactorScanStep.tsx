import { CopyIcon } from 'lucide-react';
import { TwoFactorCodeField } from '@/modules/settings/components/TwoFactorCodeField';
import { QrCode } from '@/modules/settings/components/QrCode';
import { TwoFactorSetupHeader } from '@/modules/settings/components/TwoFactorSetupHeader';
import { useVerifyTwoFactor } from '@/modules/settings/hooks/useTwoFactor';
import { useTwoFactorSetupStore } from '@/modules/settings/stores/useTwoFactorSetupStore';
import type { TwoFactorScanStepProps } from '@/modules/settings/types/types';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';
import { useCopyToClipboard } from '@/shared/hooks/useCopyToClipboard';

const { twoFactor } = resources.settings.security;

/** The secret inside a `otpauth://` URI, grouped in fours the way an app asks for it. */
const manualKey = (totpURI: string) =>
  (new URL(totpURI).searchParams.get('secret') ?? '').replace(/(.{4})(?=.)/g, '$1 ');

/** Step 2: scan the code, then confirm with the 6 digits the app shows. */
export const TwoFactorScanStep = ({ totpURI, backupCodes }: TwoFactorScanStepProps) => {
  const { code, setCode, setStep, reset } = useTwoFactorSetupStore();
  const verify = useVerifyTwoFactor();
  const { copy } = useCopyToClipboard();
  const key = manualKey(totpURI);

  return (
    <div className="flex flex-col gap-4 px-4 py-3.5">
      <TwoFactorSetupHeader step={2} text={twoFactor.scanStep} onCancel={reset} />
      <div className="flex flex-col gap-4 sm:flex-row">
        <QrCode value={totpURI} label={twoFactor.qr} />
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
                onClick={() => void copy(key.replaceAll(' ', ''))}
              >
                <CopyIcon />
              </Button>
            </div>
          </div>
          <TwoFactorCodeField
            code={code}
            onChange={setCode}
            isPending={verify.isPending}
            error={verify.error?.message}
          />
        </form>
      </div>
    </div>
  );
};
