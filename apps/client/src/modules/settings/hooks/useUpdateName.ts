import { useMutation } from '@tanstack/react-query';
import { authClient } from '@/libs/auth/client';
import { runAuthRequest } from '@/modules/auth/utils/runAuthRequest';
import type { ProfileNameValues } from '@/modules/settings/types/types';

/** Saves the Registered user's name; better-auth then refetches the session, so the header follows. */
export const useUpdateName = () =>
  useMutation({
    mutationFn: ({ name }: ProfileNameValues) =>
      runAuthRequest(() => authClient.updateUser({ name })),
    meta: { inlineError: true },
  });
