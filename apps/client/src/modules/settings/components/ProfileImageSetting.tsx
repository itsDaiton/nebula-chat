import { Loader2Icon } from 'lucide-react';
import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { toast } from 'sonner';
import { useGetProfileImageSettings } from '@/libs/api/generated/profile-image/profile-image';
import { SettingsRow } from '@/modules/settings/components/SettingsRow';
import { useProfileImageRemoval } from '@/modules/settings/hooks/useProfileImageRemoval';
import { useProfileImageUpload } from '@/modules/settings/hooks/useProfileImageUpload';
import type { ProfileImageSettingProps } from '@/modules/settings/types/types';
import {
  PROFILE_IMAGE_TYPES,
  profileImageErrorMessage,
} from '@/modules/settings/utils/profileImage';
import { resources } from '@/resources';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Button } from '@/shared/components/ui/button';
import { initialsOf } from '@/shared/utils/initialsOf';

const { image: copy } = resources.settings.profile;

/** The Profile image row: the Avatar large, uploaded straight from the picker, removable while set. */
export const ProfileImageSetting = ({ name, image }: ProfileImageSettingProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  // Unknown until it answers, and a failure reads as off: Upload only shows when it can work.
  const { data: settings } = useGetProfileImageSettings({ query: { meta: { inlineError: true } } });
  const upload = useProfileImageUpload();
  const removal = useProfileImageRemoval();
  const isPending = upload.isPending || removal.isPending;
  // Only the latest attempt's failure is shown.
  const error = upload.submittedAt > removal.submittedAt ? upload.error : removal.error;

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Cleared, so picking the same file again still fires a change.
    event.target.value = '';
    if (!file) return;
    removal.reset();
    upload.mutate(file, { onSuccess: () => toast.success(copy.uploaded) });
  };

  const onRemove = () => {
    upload.reset();
    removal.mutate(undefined, { onSuccess: () => toast.success(copy.removed) });
  };

  return (
    <SettingsRow label={copy.label} description={copy.description}>
      <div className="flex flex-col gap-2 sm:items-end">
        <div className="flex items-center gap-3">
          <div className="relative" aria-busy={isPending}>
            <Avatar className="size-12">
              {image && <AvatarImage src={image} alt={name} />}
              <AvatarFallback>{initialsOf(name)}</AvatarFallback>
            </Avatar>
            {upload.isPending && (
              <Loader2Icon
                aria-label={copy.uploading}
                className="absolute inset-0 m-auto size-4 animate-spin"
              />
            )}
          </div>
          {settings?.uploadsEnabled && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept={PROFILE_IMAGE_TYPES.join(',')}
                hidden
                aria-label={copy.label}
                onChange={onPick}
              />
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => inputRef.current?.click()}
              >
                {copy.upload}
              </Button>
            </>
          )}
          {/* A provider's Profile image stays removable with uploads switched off. */}
          {image && (
            <Button variant="ghost" disabled={isPending} onClick={onRemove}>
              {copy.remove}
            </Button>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {profileImageErrorMessage(error)}
          </p>
        )}
      </div>
    </SettingsRow>
  );
};
