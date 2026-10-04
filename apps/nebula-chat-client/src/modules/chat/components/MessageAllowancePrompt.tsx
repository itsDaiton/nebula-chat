import { Alert, Button } from '@chakra-ui/react';
import { LuLogIn } from 'react-icons/lu';
import { Link } from 'react-router';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { resources } from '@/resources';
import { route } from '@/routing/routes';

/** Shown once a Guest's send is refused at the message allowance; registering lifts it. */
export const MessageAllowancePrompt = () => {
  const { isGuest } = useAuth();
  const isMessageAllowanceReached = useChatStreamStore((state) => state.isMessageAllowanceReached);

  if (!isGuest || !isMessageAllowanceReached) return null;

  return (
    <Alert.Root status="info" role="alert" alignItems="center" mx={4} mt={4} width="auto">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{resources.chat.messageAllowance.title}</Alert.Title>
        <Alert.Description>{resources.chat.messageAllowance.description}</Alert.Description>
      </Alert.Content>
      <Button asChild size="sm" borderRadius="full" flexShrink={0}>
        <Link to={route.auth()}>
          <LuLogIn />
          {resources.chat.messageAllowance.action}
        </Link>
      </Button>
    </Alert.Root>
  );
};
