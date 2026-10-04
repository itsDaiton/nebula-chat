import { Button } from '@chakra-ui/react';
import { LuMailCheck } from 'react-icons/lu';
import { useResendVerification } from '@/modules/auth/hooks/useResendVerification';
import { resources } from '@/resources';

export const ResendVerificationButton = () => {
  const { mutate: resend, isPending } = useResendVerification();

  return (
    <Button
      size="sm"
      borderRadius="full"
      flexShrink={0}
      loading={isPending}
      onClick={() => resend()}
    >
      <LuMailCheck />
      {resources.auth.emailVerification.resend}
    </Button>
  );
};
