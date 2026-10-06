import { useMutation } from '@tanstack/react-query';
import { authClient } from '@/libs/auth/client';
import type { SocialProvider } from '@/modules/auth/types/types';
import {
  socialSignInCallbackUrl,
  socialSignInErrorCallbackUrl,
} from '@/modules/auth/utils/authCallbackUrl';
import { runAuthRequest } from '@/modules/auth/utils/runAuthRequest';

/**
 * Starts a social sign-in; better-auth's client then leaves for the provider. Its callback signs
 * the user in on the server (claiming a Guest's conversations) and reloads the app at the chat.
 */
export const useSocialSignIn = () =>
  useMutation({
    mutationFn: (provider: SocialProvider) =>
      runAuthRequest(() =>
        authClient.signIn.social({
          provider,
          callbackURL: socialSignInCallbackUrl(),
          errorCallbackURL: socialSignInErrorCallbackUrl(),
        }),
      ),
    meta: { inlineError: true },
  });
