import { useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { OwnKeyStatus } from '@/libs/api/generated/model/ownKeyStatus';
import { SettingsRow } from '@/modules/settings/components/SettingsRow';
import { useRemoveOwnKey, useSaveOwnKey } from '@/modules/settings/hooks/useOwnKeys';
import type { OwnKeySettingProps } from '@/modules/settings/types/types';
import { ownKeyErrorMessage } from '@/modules/settings/utils/ownKeys';
import { resources } from '@/resources';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

const copy = resources.settings.ownKeys;

/** One provider's key: write-only input to save or replace it, and its last four characters, status and removal once stored. */
export const OwnKeySetting = ({ provider, stored }: OwnKeySettingProps) => {
  const name = copy.providers[provider];
  const [isEditing, setIsEditing] = useState(false);
  const [key, setKey] = useState('');
  const save = useSaveOwnKey();
  const removal = useRemoveOwnKey();
  const showInput = !stored || isEditing;
  const error = save.error ?? removal.error;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    removal.reset();
    save.mutate(
      { provider, key: key.trim() },
      {
        onSuccess: () => {
          // The key leaves the page the moment it is sent.
          setKey('');
          setIsEditing(false);
          toast.success(copy.saved);
        },
      },
    );
  };

  const onRemove = () => {
    save.reset();
    removal.mutate(provider, { onSuccess: () => toast.success(copy.removed) });
  };

  const description = stored ? (
    <span className="flex flex-wrap items-center gap-2">
      <span className="font-mono">{copy.stored(stored.lastFour)}</span>
      <Badge variant="outline">{copy.status[stored.status]}</Badge>
      {stored.status === OwnKeyStatus.invalid && <span>{copy.invalidHint}</span>}
    </span>
  ) : (
    copy.none
  );

  return (
    <SettingsRow label={copy.label(name)} description={description} stacked={showInput}>
      <div className="flex flex-col gap-2 sm:items-end">
        {showInput ? (
          <form onSubmit={onSubmit} className="flex gap-2" noValidate>
            <Input
              type="password"
              autoComplete="off"
              spellCheck={false}
              aria-label={copy.inputLabel(name)}
              value={key}
              onChange={(event) => setKey(event.target.value)}
            />
            <Button type="submit" disabled={key.trim().length < 8} loading={save.isPending}>
              {save.isPending ? copy.saving : copy.save}
            </Button>
            {isEditing && (
              <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
                {copy.cancel}
              </Button>
            )}
          </form>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              {copy.replace}
            </Button>
            <Button variant="ghost" loading={removal.isPending} onClick={onRemove}>
              {copy.remove}
            </Button>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {ownKeyErrorMessage(error)}
          </p>
        )}
      </div>
    </SettingsRow>
  );
};
