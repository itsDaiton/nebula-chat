import { Button, HStack, Text } from '@chakra-ui/react';
import { Link } from '@tanstack/react-router';
import { LuLogIn, LuTriangleAlert } from 'react-icons/lu';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useMessageAllowance } from '@/modules/chat/hooks/useMessageAllowance';
import { resources } from '@/resources';

const { messageAllowance } = resources.chat;

/** A Metered user's messages left; at zero the wall prompt takes its place. */
export const MessageAllowanceCounter = () => {
  const { isGuest } = useAuth();
  const { allowance, isLow, isSpent } = useMessageAllowance();

  if (!allowance || isSpent) return null;

  return (
    <HStack
      role="status"
      mx={4}
      mt={3}
      gap={2}
      justify="center"
      textStyle="sm"
      color={isLow ? 'fg.warning' : 'fg.muted'}
    >
      {isLow && <LuTriangleAlert aria-hidden />}
      <Text>{messageAllowance.remaining(allowance.remaining, allowance.limit)}</Text>
      {/* An unverified user's resend action is already in the verify-email reminder above. */}
      {isLow && isGuest && (
        <Button asChild size="xs" variant="outline" borderRadius="full">
          <Link to="/auth">
            <LuLogIn />
            {messageAllowance.action}
          </Link>
        </Button>
      )}
    </HStack>
  );
};
