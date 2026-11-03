import { getRouteApi } from '@tanstack/react-router';
import { Loader2Icon } from 'lucide-react';
import { AuthFormAlert } from '@/modules/auth/components/AuthFormAlert';
import { SocialIcon } from '@/modules/auth/components/SocialIcon';
import { useSocialSignIn } from '@/modules/auth/hooks/useSocialSignIn';
import { SOCIAL_PROVIDERS, socialCallbackError } from '@/modules/auth/utils/socialSignIn';
import { Button } from '@/shared/components/ui/button';

const routeApi = getRouteApi('/_app/auth/');

/** "Continue with GitHub / Google", plus why the last attempt failed if it did. */
export const SocialSignIn = () => {
  const { error: callbackErrorCode } = routeApi.useSearch();
  const { mutate: signIn, error, isIdle, isPending, isSuccess, variables } = useSocialSignIn();
  // Success means the browser is leaving for the provider, so the buttons stay busy until it does.
  const isLeaving = isPending || isSuccess;
  // The callback's `?error=` describes the last attempt, so a new one replaces it.
  const callbackError = isIdle ? socialCallbackError(callbackErrorCode) : undefined;

  return (
    <div className="mt-5 flex flex-col gap-2">
      <AuthFormAlert message={error?.message ?? callbackError} />
      {SOCIAL_PROVIDERS.map(({ provider, label }) => (
        <Button
          key={provider}
          variant="outline"
          size="lg"
          className="w-full"
          disabled={isLeaving}
          aria-busy={isLeaving && variables === provider}
          onClick={() => signIn(provider)}
        >
          {isLeaving && variables === provider ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <SocialIcon provider={provider} />
          )}
          {label}
        </Button>
      ))}
    </div>
  );
};
