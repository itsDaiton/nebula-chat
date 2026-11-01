import { CopyIcon, DownloadIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { BackupCodesProps } from '@/modules/settings/types/types';
import { downloadBackupCodes } from '@/modules/settings/utils/backupCodes';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';

const { twoFactor } = resources.settings.security;

/** The backup codes, with Copy and Download; they are only ever shown once. */
export const BackupCodes = ({ codes }: BackupCodesProps) => {
  const copy = async () => {
    await navigator.clipboard.writeText(codes.join('\n'));
    toast(twoFactor.copied);
  };

  return (
    <div className="flex flex-col gap-3">
      <ul
        aria-label={twoFactor.backupCodes}
        className="grid max-w-sm grid-cols-2 gap-1.5 font-mono text-sm"
      >
        {codes.map((code) => (
          <li key={code} className="rounded-md border border-border bg-muted/40 px-2.5 py-1">
            {code}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => void copy()}>
          <CopyIcon />
          {twoFactor.copyCodes}
        </Button>
        <Button
          variant="outline"
          onClick={() => downloadBackupCodes(codes, twoFactor.downloadName)}
        >
          <DownloadIcon />
          {twoFactor.downloadCodes}
        </Button>
      </div>
    </div>
  );
};
