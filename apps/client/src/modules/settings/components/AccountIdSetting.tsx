import { CheckIcon, CopyIcon } from 'lucide-react';
import { useState } from 'react';
import { SettingsRow } from '@/modules/settings/components/SettingsRow';
import type { AccountIdSettingProps } from '@/modules/settings/types/types';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';

const { accountId } = resources.settings.account;

export const AccountIdSetting = ({ id }: AccountIdSettingProps) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(id);
    setCopied(true);
  };

  return (
    <SettingsRow
      label={accountId.label}
      description={<code className="font-mono text-xs break-all">{id}</code>}
    >
      <Button variant="outline" aria-label={accountId.copyLabel} onClick={() => void copy()}>
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? accountId.copied : accountId.copy}
      </Button>
    </SettingsRow>
  );
};
