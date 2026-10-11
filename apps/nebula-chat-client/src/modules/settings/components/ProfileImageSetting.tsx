import { AbsoluteCenter, Box, Button, HStack, Spinner, Stack, Text } from '@chakra-ui/react';
import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useGetProfileImageSettings } from '@/libs/api/generated/profile-image/profile-image';
import { UserAvatar } from '@/modules/auth/components/UserAvatar';
import { SettingsRow } from '@/modules/settings/components/SettingsRow';
import { useProfileImageRemoval } from '@/modules/settings/hooks/useProfileImageRemoval';
import { useProfileImageUpload } from '@/modules/settings/hooks/useProfileImageUpload';
import type { ProfileImageSettingProps } from '@/modules/settings/types/types';
import {
  PROFILE_IMAGE_TYPES,
  profileImageErrorMessage,
} from '@/modules/settings/utils/profileImage';
import { resources } from '@/resources';
import { toaster } from '@/shared/components/ui/toaster';

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
    upload.mutate(file, {
      onSuccess: () => toaster.create({ type: 'success', title: copy.uploaded }),
    });
  };

  const onRemove = () => {
    upload.reset();
    removal.mutate(undefined, {
      onSuccess: () => toaster.create({ type: 'success', title: copy.removed }),
    });
  };

  return (
    <SettingsRow label={copy.label} description={copy.description}>
      <Stack gap={2} align={{ base: 'flex-start', md: 'flex-end' }}>
        <HStack gap={4}>
          <Box position="relative" aria-busy={isPending}>
            <UserAvatar name={name} image={image} size="2xl" />
            {upload.isPending && (
              <AbsoluteCenter>
                <Spinner size="sm" aria-label={copy.uploading} />
              </AbsoluteCenter>
            )}
          </Box>
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
                loading={upload.isPending}
                disabled={isPending}
                onClick={() => inputRef.current?.click()}
              >
                {copy.upload}
              </Button>
            </>
          )}
          {/* A provider picture stays removable without uploads switched on. */}
          {image && (
            <Button
              variant="ghost"
              loading={removal.isPending}
              disabled={isPending}
              onClick={onRemove}
            >
              {copy.remove}
            </Button>
          )}
        </HStack>
        {error && (
          <Text role="alert" fontSize="sm" color="fg.error">
            {profileImageErrorMessage(error)}
          </Text>
        )}
      </Stack>
    </SettingsRow>
  );
};
