import { useMutation } from '@tanstack/react-query';
import { uploadProfileImage } from '@/libs/api/generated/profile-image/profile-image';
import { refreshSessionPastCache } from '@/modules/auth/utils/refreshSessionPastCache';
import { rejectProfileImageFile } from '@/modules/settings/utils/profileImage';

/** Uploads a picked file as the user's Profile image; a file the server would refuse is never sent. */
export const useProfileImageUpload = () =>
  useMutation({
    mutationFn: async (file: File) => {
      const rejection = rejectProfileImageFile(file);
      if (rejection) throw rejection;
      // The generated call always declares JPEG; send the file's own type.
      await uploadProfileImage(file, { headers: { 'Content-Type': file.type } });
      await refreshSessionPastCache();
    },
    meta: { inlineError: true },
  });
