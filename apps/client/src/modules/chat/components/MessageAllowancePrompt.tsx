import { Alert, Button } from '@chakra-ui/react';
import { Link } from '@tanstack/react-router';
import { LuLogIn } from 'react-icons/lu';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useMessageAllowance } from '@/modules/chat/hooks/useMessageAllowance';
import { resources } from '@/resources';

/** Shown once a Guest's message allowance is spent (or a send was refused at it); registering lifts it. */
export const MessageAllowancePrompt = () => {
  const { isGuest } = useAuth();
  const { isSpent } = useMessageAllowance();

  if (!isGuest || !isSpent) return null;

  return (
    <Alert.Root status="info" role="alert" alignItems="center" mx={4} mt={4} width="auto">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{resources.chat.messageAllowance.title}</Alert.Title>
        <Alert.Description>{resources.chat.messageAllowance.description}</Alert.Description>
      </Alert.Content>
      <Button asChild size="sm" borderRadius="full" flexShrink={0}>
        <Link to="/auth">
          <LuLogIn />
          {resources.chat.messageAllowance.action}
        </Link>
      </Button>
    </Alert.Root>
  );
};
