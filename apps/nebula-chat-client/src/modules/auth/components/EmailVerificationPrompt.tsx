import { Alert } from '@chakra-ui/react';
import { ResendVerificationButton } from '@/modules/auth/components/ResendVerificationButton';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { resources } from '@/resources';

/** Reminds a Registered user to verify their email until they follow the link. */
export const EmailVerificationPrompt = () => {
  const { needsEmailVerification } = useAuth();

  if (!needsEmailVerification) return null;

  return (
    <Alert.Root status="info" role="status" alignItems="center" mx={4} mt={4} width="auto">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{resources.auth.emailVerification.title}</Alert.Title>
        <Alert.Description>{resources.auth.emailVerification.description}</Alert.Description>
      </Alert.Content>
      <ResendVerificationButton />
    </Alert.Root>
  );
};
