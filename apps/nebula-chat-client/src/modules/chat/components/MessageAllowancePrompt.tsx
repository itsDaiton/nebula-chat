import { Alert, Button } from '@chakra-ui/react';
import { LuLogIn } from 'react-icons/lu';
import { Link } from 'react-router';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useMessageAllowance } from '@/modules/chat/hooks/useMessageAllowance';
import { resources } from '@/resources';
import { route } from '@/routing/routes';

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
        <Link to={route.auth.root()}>
          <LuLogIn />
          {resources.chat.messageAllowance.action}
        </Link>
      </Button>
    </Alert.Root>
  );
};
