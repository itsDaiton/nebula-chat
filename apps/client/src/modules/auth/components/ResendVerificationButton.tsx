import { MailCheckIcon } from 'lucide-react';
import { useResendVerification } from '@/modules/auth/hooks/useResendVerification';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';

export const ResendVerificationButton = () => {
  const { mutate: resend, isPending } = useResendVerification();

  return (
    <Button variant="outline" className="shrink-0" loading={isPending} onClick={() => resend()}>
      <MailCheckIcon />
      {resources.auth.emailVerification.resend}
    </Button>
  );
};
