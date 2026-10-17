import { Alert } from '@chakra-ui/react';
import { ResendVerificationButton } from '@/modules/auth/components/ResendVerificationButton';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useMessageAllowance } from '@/modules/chat/hooks/useMessageAllowance';
import { resources } from '@/resources';

const { emailVerification } = resources.auth;

/** Reminds an unverified Registered user to verify; once they hit the allowance, verifying is the way on. */
export const EmailVerificationPrompt = () => {
  const { needsEmailVerification } = useAuth();
  const { isSpent } = useMessageAllowance();

  if (!needsEmailVerification) return null;

  return (
    <Alert.Root
      status={isSpent ? 'warning' : 'info'}
      role={isSpent ? 'alert' : 'status'}
      alignItems="center"
      mx={4}
      mt={4}
      width="auto"
    >
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>
          {isSpent ? emailVerification.allowanceReachedTitle : emailVerification.title}
        </Alert.Title>
        <Alert.Description>
          {isSpent ? emailVerification.allowanceReachedDescription : emailVerification.description}
        </Alert.Description>
      </Alert.Content>
      <ResendVerificationButton />
    </Alert.Root>
  );
};
