import { useMutation } from '@tanstack/react-query';
import { removeProfileImage } from '@/libs/api/generated/profile-image/profile-image';
import { refreshSession } from '@/modules/auth/utils/refreshSession';

/** Removes the user's Profile image, so their Avatar goes back to initials. */
export const useProfileImageRemoval = () =>
  useMutation({
    mutationFn: async () => {
      await removeProfileImage();
      await refreshSession();
    },
    meta: { inlineError: true },
  });
