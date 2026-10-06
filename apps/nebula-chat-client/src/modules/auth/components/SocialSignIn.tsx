import { Button, Icon, Stack } from '@chakra-ui/react';
import { useSearchParams } from 'react-router';
import { AuthFormAlert } from '@/modules/auth/components/AuthFormAlert';
import { useSocialSignIn } from '@/modules/auth/hooks/useSocialSignIn';
import { SOCIAL_PROVIDERS, socialCallbackError } from '@/modules/auth/utils/socialSignIn';

/** "Continue with Google / GitHub", plus why the last attempt failed if it did. */
export const SocialSignIn = () => {
  const [searchParams] = useSearchParams();
  const { mutate: signIn, error, isIdle, isPending, isSuccess, variables } = useSocialSignIn();
  // Success means the browser is leaving for the provider, so the buttons stay busy until it does.
  const isLeaving = isPending || isSuccess;
  // The callback's `?error=` describes the last attempt, so a new one replaces it.
  const callbackError = isIdle ? socialCallbackError(searchParams.get('error')) : undefined;

  return (
    <Stack w="full" gap={3}>
      <AuthFormAlert message={error?.message ?? callbackError} />
      {SOCIAL_PROVIDERS.map(({ provider, label, icon }) => (
        <Button
          key={provider}
          variant="outline"
          borderColor="border.emphasized"
          w="full"
          loading={isLeaving && variables === provider}
          disabled={isLeaving}
          onClick={() => signIn(provider)}
        >
          <Icon as={icon} aria-hidden />
          {label}
        </Button>
      ))}
    </Stack>
  );
};
